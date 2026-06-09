import { IsNumber, IsString, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateProfessionalServiceDto {
    @ApiProperty({ example: 1, description: 'ID de categoría de servicio del catálogo global' })
    @IsNotEmpty({ message: 'Debes seleccionar una categoría de servicio' })
    @IsNumber({}, { message: 'serviceId debe ser un número' })
    @Type(() => Number)
    serviceId: number;

    @ApiProperty({ example: 180000, description: 'Precio del servicio en COP' })
    @IsNotEmpty({ message: 'El precio es requerido' })
    @IsNumber({}, { message: 'price debe ser un número' })
    @Min(0, { message: 'El precio no puede ser negativo' })
    @Type(() => Number)
    price: number;

    @ApiProperty({ example: 45, description: 'Duración en minutos' })
    @IsNotEmpty({ message: 'La duración es requerida' })
    @IsNumber({}, { message: 'duration debe ser un número entero' })
    @Min(5, { message: 'La duración mínima es 5 minutos' })
    @Type(() => Number)
    duration: number;

    @ApiPropertyOptional({ example: 'Incluye lavado y secado' })
    @IsOptional()
    @IsString({ message: 'description debe ser texto' })
    description?: string;
}

export class UpdateProfessionalServiceDto extends PartialType(CreateProfessionalServiceDto) {}
