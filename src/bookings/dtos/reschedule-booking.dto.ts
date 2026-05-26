import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleBookingDto {
    @ApiProperty({ example: '2026-04-15' })
    @IsString()
    date: string;

    @ApiProperty({ example: '14:00' })
    @IsString()
    startTime: string;
}
