import { ApiProperty } from "@nestjs/swagger"
import { IsArray, IsNumber } from "class-validator"


export class StateSpacePointDTOCreate {
    @IsNumber()
    @ApiProperty({
        name: "clockTick",
        type: Number,
        description: "The clock tick for which the state space point is recorded",
        example: 1
    })
    clockTick: number

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({
        name: "board",
        description: "The state of the Board",
        type: [Number],
        example: [
            0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1,
            0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
            0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0
        ]
    })
    board: number[]

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({
        name: "agentStates",
        description: "The state of the Agent Set",
        type: [Number],
        example: [
            0, 0, 0, 1
        ]
    })
    agentStates: number[]

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({
        name: "plant",
        description: "The state of the Plant",
        type: [Number],
        example: [0, 0, 0, 0, 0, 0, 0, 0]
    })
    plant: number[]

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({
        name: "reporting",
        description: "The state of the Reporting System",
        type: [Number],
        example: [0,873600,-873600,91,1,1,300,9600]
    })
    reporting: number[]

    @ApiProperty({
        name: "priorityTensor",
        description: "The priority tensor at this clock tick",
        type: [[[Number]]],
    })
    priorityTensor: number[][][]
}