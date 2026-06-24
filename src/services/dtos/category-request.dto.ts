import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryRequestDto {
    @ApiProperty({ description: 'Nombre del servicio propuesto', example: 'Masaje Deportivo' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({ description: 'Categoría del servicio', example: 'Bienestar' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    category: string;

    @ApiPropertyOptional({ description: 'Descripción del servicio' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Nombre del icono (opcional)', example: 'heart' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    icon?: string;
}

export class ReviewCategoryRequestDto {
    @ApiProperty({ description: 'Acción del admin', enum: ['approved', 'rejected'] })
    @IsEnum(['approved', 'rejected'])
    action: 'approved' | 'rejected';

    @ApiPropertyOptional({ description: 'Notas del admin (motivo de rechazo, etc.)' })
    @IsOptional()
    @IsString()
    notes?: string;
}
