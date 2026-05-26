import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'santiago@justme.com' })
    readonly email: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'SecureP@ss123' })
    readonly password: string;
}