import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationType } from '../entities/booking.entity';

export class CreateBookingDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    professionalId: number;

    @ApiProperty({ example: 1, description: 'Professional service ID' })
    @IsNumber()
    professionalServiceId: number;

    @ApiProperty({ example: '2026-03-15' })
    @IsString()
    date: string;

    @ApiProperty({ example: '10:00' })
    @IsString()
    startTime: string;

    @ApiPropertyOptional({ example: '123 Salon Ave, Bogotá' })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiPropertyOptional({ enum: LocationType, default: LocationType.PROFESSIONAL })
    @IsEnum(LocationType)
    @IsOptional()
    locationType?: LocationType;

    @ApiPropertyOptional({ example: 4.711 })
    @IsNumber()
    @IsOptional()
    latitude?: number;

    @ApiPropertyOptional({ example: -74.0721 })
    @IsNumber()
    @IsOptional()
    longitude?: number;

    @ApiPropertyOptional({ example: 50000 })
    @IsNumber()
    @IsOptional()
    price?: number;
}

export class UpdateBookingStatusDto {
    @ApiProperty({ enum: ['confirmed', 'completed', 'cancelled'] })
    @IsString()
    status: string;
}
