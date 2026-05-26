import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/services/users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dtos/register.dto';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
    ) {}

    async validateUser(email: string, password: string) {
        const user: User = await this.usersService.findByEmail(email);

        // Check if user exists, if password input exists, if db password exists, and if they match
        if (!user || !password || !user.password || !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isDeactivated = user.isActive === false || String(user.isActive) === 'false' || String(user.isActive) === '0';
        
        if (isDeactivated) {
            throw new UnauthorizedException('Cuenta desabilitada por incumplimiento de las normas, contacte con soporte');
        }

        const { password: _, refreshToken: __, ...result } = user;
        return result;
    }

    async login(user: any) {
        if (user.isTwoFactorEnabled) {
            return {
                require2FA: true,
                userId: user.id,
            };
        }

        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles?.map((r: any) => r.name) || [],
        };

        const tokens = await this.generateTokens(payload);
        await this.usersService.updateRefreshToken(user.id, tokens.refresh_token);

        return {
            ...tokens,
            user,
        };
    }

    async loginWith2FA(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles?.map((r: any) => r.name) || [],
        };

        const tokens = await this.generateTokens(payload);
        await this.usersService.updateRefreshToken(user.id, tokens.refresh_token);

        const { password: _, refreshToken: __, twoFactorSecret: ___, ...userResult } = user;
        return {
            ...tokens,
            user: userResult,
        };
    }

    async register(registerDto: RegisterDto) {
        // Check if user already exists
        try {
            await this.usersService.findByEmail(registerDto.email);
            throw new ConflictException('Email already registered');
        } catch (error) {
            if (error instanceof ConflictException) throw error;
            // User not found, proceed with registration
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const newUser = await this.usersService.createFromRegister({
            name: registerDto.name,
            lastName: registerDto.lastName,
            docType: registerDto.docType,
            docNumber: registerDto.docNumber,
            email: registerDto.email,
            phone: registerDto.phone,
            password: hashedPassword,
            role: registerDto.role,
        });

        const { password: _, refreshToken: __, ...userResult } = newUser;
        return this.login(userResult);
    }

    async refreshTokens(userId: number) {
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles?.map((r: any) => r.name) || [],
        };

        const tokens = await this.generateTokens(payload);
        await this.usersService.updateRefreshToken(user.id, tokens.refresh_token);

        const { password: _, refreshToken: __, ...userResult } = user;
        return {
            ...tokens,
            user: userResult,
        };
    }

    async logout(userId: number) {
        await this.usersService.updateRefreshToken(userId, null);
        return { message: 'Logged out successfully' };
    }

    async forgotPassword(email: string) {
        let user: any;
        try {
            user = await this.usersService.findByEmail(email);
        } catch {
            // No revelar al cliente si existe o no el correo por seguridad
            return { message: 'Si el correo está registrado, recibirás un enlace.' };
        }

        // Generar código de 6 dígitos
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        await this.usersService.setRecoveryToken(user.id, token, expires);
        await this.mailService.sendPasswordResetEmail({ name: user.name, email: user.email }, token);

        return { message: 'Si el correo está registrado, recibirás un enlace.' };
    }

    async resetPassword(email: string, token: string, newPassword: string) {
        let user: any;
        try {
            user = await this.usersService.findByEmail(email);
        } catch {
            throw new UnauthorizedException('Datos inválidos');
        }

        if (
            !user.recoveryToken ||
            user.recoveryToken !== token ||
            !user.recoveryTokenExpires ||
            new Date() > new Date(user.recoveryTokenExpires)
        ) {
            throw new UnauthorizedException('El código es inválido o ha expirado');
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await this.usersService.updatePassword(user.id, hashed);

        return { message: 'Contraseña actualizada correctamente' };
    }

    private async generateTokens(payload: { sub: number; email: string; roles: string[] }) {
        const [access_token, refresh_token] = await Promise.all([
            this.jwtService.signAsync(payload),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('config.jwt.refreshSecret'),
                expiresIn: this.configService.get<number>('config.jwt.refreshExpiresIn'),
            }),
        ]);

        return { access_token, refresh_token };
    }
}
