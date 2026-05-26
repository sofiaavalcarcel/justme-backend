import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateServiceDto {
    @ApiProperty({ example: 'Barber' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'scissors' })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiProperty({ example: 'hair' })
    @IsString()
    category: string;

    @ApiPropertyOptional({ example: 'Professional barber services' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
