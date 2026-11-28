import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
    AutoScalingClient,
    DescribeAutoScalingGroupsCommand,
    DescribeScalingActivitiesCommand,
    UpdateAutoScalingGroupCommand
} from "@aws-sdk/client-auto-scaling";
import { DescribeInstancesCommand, EC2Client } from "@aws-sdk/client-ec2";
import environment from "../../../../../env/environment";
import { FleetCountsDTO, FleetDTO, FleetInstanceDTO, FleetInstancePhase } from "./fleet.dto";

type Client = { send: (command: any) => Promise<any> };

/** Tag a node instance sets on itself once its node processes run (deploy/aws/node-setup.sh). */
export const NODE_READY_TAG = "arion:node-ready";

/** The node fleet: an AWS Auto Scaling group whose size the analyst can set (env `fleet`). */
@Injectable()
export class FleetService {
    private _logger: Logger = new Logger(FleetService.name);
    private _group: string | null;
    private _autoScaling: Client | null;
    private _ec2: Client | null;

    constructor() {
        const fleet = environment().fleet;
        this._group = fleet?.autoScalingGroup ?? null;
        // credentials come from the instance role (no keys are stored)
        this._autoScaling = this._group ? new AutoScalingClient({ region: fleet?.region }) : null;
        this._ec2 = this._group ? new EC2Client({ region: fleet?.region }) : null;
    }

    /** Replaces the AWS clients (tests). */
    setClients(autoScaling: Client, ec2: Client, group: string): void {
        this._autoScaling = autoScaling;
        this._ec2 = ec2;
        this._group = group;
    }

    async get(): Promise<FleetDTO> {
        if (!this._autoScaling || !this._group) return { enabled: false };
        const response = await this._autoScaling.send(new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [this._group] }));
        const group = response.AutoScalingGroups?.[0];
        if (!group) throw new NotFoundException(`Auto Scaling group ${this._group} not found`);
        const members: any[] = group.Instances ?? [];

        // launch times and readiness tags from EC2 (best effort: without them, in-service instances count as building)
        const details = new Map<string, any>();
        if (members.length > 0 && this._ec2) {
            try {
                const ec2 = await this._ec2.send(new DescribeInstancesCommand({ InstanceIds: members.map((m) => m.InstanceId) }));
                for (const reservation of ec2.Reservations ?? []) for (const instance of reservation.Instances ?? []) details.set(instance.InstanceId, instance);
            } catch (error) {
                this._logger.warn(`EC2 instance details unavailable: ${(error as Error)?.message ?? error}`);
            }
        }
        const instances: FleetInstanceDTO[] = members.map((member) => {
            const detail = details.get(member.InstanceId);
            const ready = (detail?.Tags ?? []).some((tag: any) => tag.Key === NODE_READY_TAG && tag.Value === "true");
            return {
                id: member.InstanceId,
                type: member.InstanceType,
                state: member.LifecycleState,
                phase: FleetService.phase(member.LifecycleState, ready),
                availabilityZone: member.AvailabilityZone,
                launchTime: detail?.LaunchTime ? new Date(detail.LaunchTime).toISOString() : undefined
            };
        });
        const count = (phase: FleetInstancePhase) => instances.filter((i) => i.phase === phase).length;
        const desired: number = group.DesiredCapacity ?? 0;
        const counts: FleetCountsDTO = {
            launching: count("launching"),
            building: count("building"),
            running: count("running"),
            stopping: count("stopping"),
            pending: Math.max(0, desired - count("running"))
        };
        return {
            enabled: true,
            group: this._group,
            desired,
            min: group.MinSize ?? 0,
            max: group.MaxSize ?? 0,
            counts,
            instances,
            lastError: counts.pending > 0 ? await this._lastLaunchError() : null
        };
    }

    /** Sets the number of node instances, within the group's maximum. */
    async scale(desired: number): Promise<FleetDTO> {
        const current = await this.get();
        if (!current.enabled) throw new NotFoundException("This server does not manage a node fleet");
        if (!Number.isInteger(desired) || desired < 0 || desired > (current.max as number)) {
            throw new BadRequestException(`The fleet size must be a whole number from 0 to ${current.max}`);
        }
        // the minimum is lowered with the size, so that 0 always stops every instance
        await (this._autoScaling as Client).send(
            new UpdateAutoScalingGroupCommand({
                AutoScalingGroupName: this._group as string,
                DesiredCapacity: desired,
                MinSize: Math.min(current.min as number, desired)
            })
        );
        this._logger.log(`Fleet ${this._group} scaled from ${current.desired} to ${desired} instances`);
        const updated = await this.get();
        if (updated.desired !== desired) {
            throw new BadRequestException(`The fleet size was not changed (target ${updated.desired}, requested ${desired})`);
        }
        return updated;
    }

    /** Phase of an instance from its Auto Scaling lifecycle state and the node's readiness tag. */
    static phase(lifecycleState: string, ready: boolean): FleetInstancePhase {
        const state = String(lifecycleState ?? "");
        if (state.startsWith("Terminating") || state === "Terminated" || state.startsWith("Detach") || state.startsWith("Standby")) return "stopping";
        if (state.startsWith("Pending")) return "launching";
        return ready ? "running" : "building";
    }

    /** The most recent failed launch in the last hour (e.g. no Spot capacity), or null. */
    private async _lastLaunchError(): Promise<string | null> {
        try {
            const response = await (this._autoScaling as Client).send(
                new DescribeScalingActivitiesCommand({ AutoScalingGroupName: this._group as string, MaxRecords: 5 })
            );
            const failed = (response.Activities ?? []).find(
                (a: any) => a.StatusCode === "Failed" && Date.now() - new Date(a.StartTime).getTime() < 3600000
            );
            return failed ? `${failed.StatusMessage ?? failed.Description}`.slice(0, 300) : null;
        } catch {
            return null;
        }
    }
}
