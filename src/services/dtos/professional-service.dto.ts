import { IsNumber, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateProfessionalServiceDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    @Type(() => Number)
    serviceId: number;

    @ApiPropertyOptional({ example: 'Corte de Cabello Premium' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 35.00 })
    @IsNumber()
    @Type(() => Number)
    price: number;

    @ApiProperty({ example: 60, description: 'Duration in minutes' })
    @IsNumber()
    @Type(() => Number)
    duration: number;

    @ApiPropertyOptional({ example: 'Precision haircut with wash and style' })
    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateProfessionalServiceDto extends PartialType(CreateProfessionalServiceDto) {}
