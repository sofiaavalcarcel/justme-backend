import { IsString, IsBoolean, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleBreakDto {
    @ApiProperty({ example: 'Almuerzo' })
    @IsString()
    title: string;

    @ApiProperty({ example: '12:00' })
    @IsString()
    startTime: string;

    @ApiProperty({ example: '13:00' })
    @IsString()
    endTime: string;
}

export class ScheduleDayDto {
    @ApiProperty({ example: 'Monday' })
    @IsString()
    dayOfWeek: string;

    @ApiProperty({ example: '08:00' })
    @IsString()
    startTime: string;

    @ApiProperty({ example: '18:00' })
    @IsString()
    endTime: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    isActive: boolean;

    @ApiProperty({ type: [ScheduleBreakDto], required: false })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ScheduleBreakDto)
    breaks?: ScheduleBreakDto[];
}
