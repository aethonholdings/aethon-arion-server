import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DescribeAutoScalingGroupsCommand, UpdateAutoScalingGroupCommand } from "@aws-sdk/client-auto-scaling";
import { FleetService } from "../../endpoints/fleet/fleet.service";

/** A fake Auto Scaling API holding one group. */
function fakeAws(group: { desired: number; min: number; max: number; instances?: any[] }) {
    const calls: any[] = [];
    const client = {
        send: async (command: any) => {
            calls.push(command);
            if (command instanceof DescribeAutoScalingGroupsCommand) {
                return {
                    AutoScalingGroups: command.input.AutoScalingGroupNames?.[0] === "arion-nodes"
                        ? [{ DesiredCapacity: group.desired, MinSize: group.min, MaxSize: group.max, Instances: group.instances ?? [] }]
                        : []
                };
            }
            if (command instanceof UpdateAutoScalingGroupCommand) {
                group.desired = command.input.DesiredCapacity as number;
                group.min = command.input.MinSize as number;
                return {};
            }
            throw new Error("unexpected command");
        }
    };
    return { client, calls, group };
}

describe("FleetService", () => {
    it("is disabled when the server manages no fleet", async () => {
        const service = new FleetService(); // the test environment configures no fleet
        expect(await service.get()).toEqual({ enabled: false });
        await expect(service.scale(2)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("describes the group and its instances", async () => {
        const aws = fakeAws({ desired: 1, min: 0, max: 8, instances: [{ InstanceId: "i-1", InstanceType: "c7g.xlarge", LifecycleState: "InService", AvailabilityZone: "eu-west-2a" }] });
        const service = new FleetService();
        service.setClient(aws.client, "arion-nodes");
        expect(await service.get()).toEqual({
            enabled: true, group: "arion-nodes", desired: 1, min: 0, max: 8,
            instances: [{ id: "i-1", type: "c7g.xlarge", state: "InService", availabilityZone: "eu-west-2a" }]
        });
    });

    it("scales within the group's maximum and lowers the minimum with the size", async () => {
        const aws = fakeAws({ desired: 2, min: 2, max: 8 });
        const service = new FleetService();
        service.setClient(aws.client, "arion-nodes");
        expect((await service.scale(4)).desired).toBe(4);
        expect(aws.group).toEqual(expect.objectContaining({ desired: 4, min: 2 }));
        expect((await service.scale(0)).desired).toBe(0);
        expect(aws.group).toEqual(expect.objectContaining({ desired: 0, min: 0 })); // 0 stops every instance
        await expect(service.scale(9)).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.scale(-1)).rejects.toBeInstanceOf(BadRequestException);
        await expect(service.scale(1.5)).rejects.toBeInstanceOf(BadRequestException);
        expect(aws.group.desired).toBe(0); // refused changes change nothing
    });

    it("reports a group that does not exist", async () => {
        const aws = fakeAws({ desired: 0, min: 0, max: 8 });
        const service = new FleetService();
        service.setClient(aws.client, "missing");
        await expect(service.get()).rejects.toBeInstanceOf(NotFoundException);
    });
});
