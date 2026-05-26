import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'Santiago' })
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @ApiProperty({ example: 'Rivera' })
    @IsString()
    @IsNotEmpty()
    readonly lastName: string;

    @ApiProperty({ example: 'CC' })
    @IsString()
    @IsNotEmpty()
    readonly docType: string;

    @ApiProperty({ example: '1020304050' })
    @IsString()
    @IsNotEmpty()
    readonly docNumber: string;

    @ApiProperty({ example: 'santiago@justme.com' })
    @IsEmail()
    @IsNotEmpty()
    readonly email: string;

    @ApiProperty({ example: '+57 310 555 1234' })
    @IsString()
    @IsNotEmpty()
    readonly phone: string;

    @ApiProperty({ example: 'SecureP@ss123' })
    @IsString()
    @IsNotEmpty()
    readonly password: string;

    @ApiProperty({ example: 'user', enum: ['user', 'professional'] })
    @IsString()
    @IsNotEmpty()
    readonly role: string;
}
