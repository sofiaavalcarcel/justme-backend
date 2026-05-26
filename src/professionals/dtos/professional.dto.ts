import { IsString, IsOptional, IsNumber, IsBoolean, IsLatitude, IsLongitude, Min, Max, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateProfessionalDto {
    @ApiProperty({ example: 'Expert barber with 5 years experience' })
    @IsString()
    @IsOptional()
    bio?: string;

    @ApiProperty({ example: 4.711 })
    @IsNumber()
    @IsLatitude()
    @Type(() => Number)
    @IsOptional()
    latitude?: number;

    @ApiProperty({ example: -74.0721 })
    @IsNumber()
    @IsLongitude()
    @Type(() => Number)
    @IsOptional()
    longitude?: number;

    @ApiPropertyOptional({ example: '123 Salon Ave, Bogotá' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ example: 5.0 })
    @IsNumber()
    @Min(0)
    @Max(50)
    @Type(() => Number)
    @IsOptional()
    serviceRadius?: number;

    @ApiPropertyOptional({ example: 'CERT-123' })
    @IsString()
    @IsOptional()
    certificationNumber?: string;

    @ApiPropertyOptional({ example: 'Barber, Stylist' })
    @IsString()
    @IsOptional()
    specialties?: string;

    @ApiPropertyOptional({ example: '5 years' })
    @IsString()
    @IsOptional()
    experience?: string;

    // Fields from User that might be sent during profile update
    @ApiPropertyOptional({ example: 'John' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional({ example: 'john@example.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({ example: '+123456789' })
    @IsString()
    @IsOptional()
    phone?: string;

    // Schedule Preferences
    @ApiPropertyOptional({ example: 8 })
    @IsNumber()
    @IsOptional()
    maxAppointments?: number;

    @ApiPropertyOptional({ example: 15 })
    @IsNumber()
    @IsOptional()
    bufferTime?: number;

    @ApiPropertyOptional({ example: 2 })
    @IsNumber()
    @IsOptional()
    advanceNotice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    schedule?: any;
}

export class UpdateProfessionalDto extends PartialType(CreateProfessionalDto) {}

export class NearbySearchDto {
    @ApiProperty({ example: 4.711 })
    @IsNumber()
    @IsLatitude()
    latitude: number;

    @ApiProperty({ example: -74.0721 })
    @IsNumber()
    @IsLongitude()
    longitude: number;

    @ApiPropertyOptional({ example: 'Barber' })
    @IsString()
    @IsOptional()
    service?: string;

    @ApiPropertyOptional({ example: '2026-03-15' })
    @IsString()
    @IsOptional()
    date?: string;

    @ApiPropertyOptional({ example: '10:00' })
    @IsString()
    @IsOptional()
    time?: string;

    @ApiPropertyOptional({ example: 5, default: 5 })
    @IsNumber()
    @Min(1)
    @Max(100)
    @IsOptional()
    radius?: number;
}

export class ServiceMatchDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    @Type(() => Number)
    serviceId: number;

    @ApiProperty({ example: 4.711 })
    @IsNumber()
    @IsLatitude()
    @Type(() => Number)
    latitude: number;

    @ApiProperty({ example: -74.0721 })
    @IsNumber()
    @IsLongitude()
    @Type(() => Number)
    longitude: number;

    @ApiPropertyOptional({ example: '2026-03-15' })
    @IsString()
    @IsOptional()
    date?: string;

    @ApiPropertyOptional({ example: '10:00' })
    @IsString()
    @IsOptional()
    time?: string;
}
