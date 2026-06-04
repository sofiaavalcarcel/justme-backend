import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateProfessionalServiceDto {
    @ApiPropertyOptional({ example: 1, description: 'ID de categoría de servicio (opcional, se asigna automáticamente)' })
    @IsOptional()
    @IsNumber({}, { message: 'serviceId debe ser un número' })
    @Type(() => Number)
    serviceId?: number;

    @ApiPropertyOptional({ example: 'Corte de Cabello Premium' })
    @IsOptional()
    @IsString({ message: 'name debe ser texto' })
    name?: string;

    @ApiPropertyOptional({ example: 35.00, description: 'Precio del servicio' })
    @IsOptional()
    @IsNumber({}, { message: 'price debe ser un número' })
    @Min(0, { message: 'El precio no puede ser negativo' })
    @Type(() => Number)
    price?: number;

    @ApiPropertyOptional({ example: 60, description: 'Duración en minutos' })
    @IsOptional()
    @IsNumber({}, { message: 'duration debe ser un número entero' })
    @Min(1, { message: 'La duración mínima es 1 minuto' })
    @Type(() => Number)
    duration?: number;

    @ApiPropertyOptional({ example: 'Precision haircut with wash and style' })
    @IsOptional()
    @IsString({ message: 'description debe ser texto' })
    description?: string;
}

export class UpdateProfessionalServiceDto extends PartialType(CreateProfessionalServiceDto) {}
