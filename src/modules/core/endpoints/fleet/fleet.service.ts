import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
    AutoScalingClient,
    DescribeAutoScalingGroupsCommand,
    UpdateAutoScalingGroupCommand
} from "@aws-sdk/client-auto-scaling";
import environment from "../../../../../env/environment";
import { FleetDTO } from "./fleet.dto";

/** The node fleet: an AWS Auto Scaling group whose size the analyst can set (env `fleet`). */
@Injectable()
export class FleetService {
    private _logger: Logger = new Logger(FleetService.name);
    private _group: string | null;
    private _client: { send: (command: any) => Promise<any> } | null;

    constructor() {
        const fleet = environment().fleet;
        this._group = fleet?.autoScalingGroup ?? null;
        // credentials come from the instance role (no keys are stored)
        this._client = this._group ? new AutoScalingClient({ region: fleet?.region }) : null;
    }

    /** Replaces the AWS client (tests). */
    setClient(client: { send: (command: any) => Promise<any> }, group: string): void {
        this._client = client;
        this._group = group;
    }

    async get(): Promise<FleetDTO> {
        if (!this._client || !this._group) return { enabled: false };
        const response = await this._client.send(new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [this._group] }));
        const group = response.AutoScalingGroups?.[0];
        if (!group) throw new NotFoundException(`Auto Scaling group ${this._group} not found`);
        return {
            enabled: true,
            group: this._group,
            desired: group.DesiredCapacity ?? 0,
            min: group.MinSize ?? 0,
            max: group.MaxSize ?? 0,
            instances: (group.Instances ?? []).map((instance: any) => ({
                id: instance.InstanceId,
                type: instance.InstanceType,
                state: instance.LifecycleState,
                availabilityZone: instance.AvailabilityZone
            }))
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
        await (this._client as any).send(
            new UpdateAutoScalingGroupCommand({
                AutoScalingGroupName: this._group as string,
                DesiredCapacity: desired,
                MinSize: Math.min(current.min as number, desired)
            })
        );
        this._logger.log(`Fleet ${this._group} scaled from ${current.desired} to ${desired} instances`);
        return { ...(await this.get()), desired };
    }
}
