import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DescribeAutoScalingGroupsCommand, DescribeScalingActivitiesCommand, UpdateAutoScalingGroupCommand } from "@aws-sdk/client-auto-scaling";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { FleetService, NODE_READY_TAG } from "../../endpoints/fleet/fleet.service";

/** A fake AWS holding one Auto Scaling group and its instances. */
function fakeAws(group: { desired: number; min: number; max: number; instances?: any[]; ready?: string[]; failure?: string; ignoreUpdates?: boolean }) {
    const updates: any[] = [];
    const autoScaling = {
        send: async (command: any) => {
            if (command instanceof DescribeAutoScalingGroupsCommand) {
                return {
                    AutoScalingGroups: command.input.AutoScalingGroupNames?.[0] === "arion-nodes"
                        ? [{ DesiredCapacity: group.desired, MinSize: group.min, MaxSize: group.max, Instances: group.instances ?? [] }]
                        : []
                };
            }
            if (command instanceof UpdateAutoScalingGroupCommand) {
                updates.push(command.input);
                if (!group.ignoreUpdates) {
                    group.desired = command.input.DesiredCapacity as number;
                    group.min = command.input.MinSize as number;
                }
                return {};
            }
            if (command instanceof DescribeScalingActivitiesCommand) {
                return { Activities: group.failure ? [{ StatusCode: "Failed", StartTime: new Date(), StatusMessage: group.failure }] : [] };
            }
            throw new Error("unexpected command");
        }
    };
    const ec2 = {
        send: async (command: any) => {
            if (!(command instanceof DescribeInstancesCommand)) throw new Error("unexpected command");
            return {
                Reservations: [{
                    Instances: (command.input.InstanceIds ?? []).map((id: string) => ({
                        InstanceId: id,
                        LaunchTime: new Date("2026-11-28T10:00:00Z"),
                        Tags: (group.ready ?? []).includes(id) ? [{ Key: NODE_READY_TAG, Value: "true" }] : []
                    }))
                }]
            };
        }
    };
    return { autoScaling, ec2, updates, group };
}
const member = (id: string, state: string) => ({ InstanceId: id, InstanceType: "c7g.xlarge", LifecycleState: state, AvailabilityZone: "eu-west-2a" });

describe("FleetService", () => {
    it("is disabled when the server manages no fleet", async () => {
        const service = new FleetService(); // the test environment configures no fleet
        expect(await service.get()).toEqual({ enabled: false });
        await expect(service.scale(2)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("reports each instance's phase and the counts, including those still to start", async () => {
        const aws = fakeAws({
            desired: 5, min: 0, max: 8, ready: ["i-run"],
            instances: [member("i-launch", "Pending"), member("i-build", "InService"), member("i-run", "InService"), member("i-stop", "Terminating:Wait")]
        });
        const service = new FleetService();
        service.setClients(aws.autoScaling, aws.ec2, "arion-nodes");
        const fleet = await service.get();
        expect(fleet.instances!.map((i) => [i.id, i.phase])).toEqual([["i-launch", "launching"], ["i-build", "building"], ["i-run", "running"], ["i-stop", "stopping"]]);
        expect(fleet.counts).toEqual({ launching: 1, building: 1, running: 1, stopping: 1, pending: 4 });
        expect(fleet.instances![0].launchTime).toBe("2026-11-28T10:00:00.000Z");
        expect(fleet.lastError).toBeNull();
    });

    it("reports why instances do not start", async () => {
        const aws = fakeAws({ desired: 2, min: 0, max: 8, failure: "There is no Spot capacity available that matches your request." });
        const service = new FleetService();
        service.setClients(aws.autoScaling, aws.ec2, "arion-nodes");
        expect((await service.get()).lastError).toContain("no Spot capacity");
    });

    it("scales within the group's maximum and lowers the minimum with the size", async () => {
        const aws = fakeAws({ desired: 2, min: 2, max: 8 });
        const service = new FleetService();
        service.setClients(aws.autoScaling, aws.ec2, "arion-nodes");
        expect((await service.scale(4)).desired).toBe(4);
        expect(aws.group).toEqual(expect.objectContaining({ desired: 4, min: 2 }));
        expect((await service.scale(0)).desired).toBe(0);
        expect(aws.group).toEqual(expect.objectContaining({ desired: 0, min: 0 })); // 0 stops every instance
        await expect(service.scale(9)).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.scale(-1)).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.scale(1.5)).rejects.toBeInstanceOf(BadRequestException);
        expect(aws.updates.length).toBe(2); // refused changes send nothing
    });

    it("reports a change that did not take effect instead of claiming success", async () => {
        const aws = fakeAws({ desired: 0, min: 0, max: 8, ignoreUpdates: true });
        const service = new FleetService();
        service.setClients(aws.autoScaling, aws.ec2, "arion-nodes");
        await expect(service.scale(3)).rejects.toThrow(/was not changed/);
    });

    it("reports a group that does not exist", async () => {
        const aws = fakeAws({ desired: 0, min: 0, max: 8 });
        const service = new FleetService();
        service.setClients(aws.autoScaling, aws.ec2, "missing");
        await expect(service.get()).rejects.toBeInstanceOf(NotFoundException);
    });
});
