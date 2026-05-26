import { Body, Controller, Get, Post, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { TwoFactorService } from '../services/two-factor.service';
import { UsersService } from '../../users/services/users/users.service';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
        private readonly twoFactorService: TwoFactorService,
        private readonly usersService: UsersService,
    ) {}

    @Post('register')
    @ApiOperation({ summary: 'Registrar un nuevo usuario' })
    async register(@Body() body: RegisterDto) {
        return this.authService.register(body);
    }

    @Post('login')
    @ApiOperation({ summary: 'Iniciar sesión con correo electrónico y contraseña' })
    async login(@Body() body: LoginDto) {
        const user = await this.authService.validateUser(body.email, body.password);
        return this.authService.login(user);
    }

    @Post('refresh')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Refrescar el token de acceso' })
    async refresh(@CurrentUser('id') userId: number) {
        return this.authService.refreshTokens(userId);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cerrar sesión e invalidar el token de refresco' })
    async logout(@CurrentUser('id') userId: number) {
        return this.authService.logout(userId);
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Solicitar código de recuperación de contraseña' })
    async forgotPassword(@Body() body: { email: string }) {
        if (!body.email) throw new BadRequestException('Email requerido');
        return this.authService.forgotPassword(body.email);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Restablecer contraseña con código de verificación' })
    async resetPassword(@Body() body: { email: string; token: string; newPassword: string }) {
        if (!body.email || !body.token || !body.newPassword) {
            throw new BadRequestException('Email, código y nueva contraseña son requeridos');
        }
        return this.authService.resetPassword(body.email, body.token, body.newPassword);
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: 'Iniciar sesión con Google' })
    async googleAuth(@Req() req: any) {
        // Inicia el flujo de Google OAuth
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: 'Callback de Google OAuth' })
    async googleAuthRedirect(@Req() req: any, @Res() res: any) {
        try {
            const result = await this.authService.login(req.user);
            const frontendUrl = this.configService.get<string>('config.platform.corsOrigin') || 'http://localhost:5173';
            
            if ('require2FA' in result) {
                return res.redirect(`${frontendUrl}/login/2fa?userId=${result.userId}`);
            }

            const role = result.user.roles?.[0]?.name || 'user';
            res.redirect(`${frontendUrl}/login?token=${result.access_token}&role=${role}`);
        } catch (err) {
            const frontendUrl = this.configService.get<string>('config.platform.corsOrigin') || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
        }
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener el perfil del usuario actual' })
    async getProfile(@CurrentUser() user: any) {
        return user;
    }

    // 2FA Endpoints
    @Post('2fa/generate')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generar código QR para 2FA' })
    async generateTwoFactor(@CurrentUser() user: any) {
        const { otpauthUrl } = await this.twoFactorService.generateTwoFactorSecret(user);
        return {
            qrCode: await this.twoFactorService.generateQrCodeDataURL(otpauthUrl),
        };
    }

    @Post('2fa/turn-on')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Activar 2FA' })
    async turnOnTwoFactor(@CurrentUser() user: any, @Body() body: { code: string }) {
        const isCodeValid = this.twoFactorService.isTwoFactorCodeValid(body.code, user);
        if (!isCodeValid) {
            throw new BadRequestException('Código de verificación inválido');
        }
        await this.twoFactorService.turnOnTwoFactorAuthentication(user.id);
        return { message: '2FA activado correctamente' };
    }

    @Post('2fa/turn-off')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Desactivar 2FA' })
    async turnOffTwoFactor(@CurrentUser() user: any) {
        await this.twoFactorService.turnOffTwoFactorAuthentication(user.id);
        return { message: '2FA desactivado correctamente' };
    }

    @Post('2fa/authenticate')
    @ApiOperation({ summary: 'Autenticar con código 2FA' })
    async authenticate(@Body() body: { userId: number; code: string }) {
        const user = await this.usersService.findOne(body.userId);
        if (!user) throw new BadRequestException('Usuario no encontrado');

        const isCodeValid = this.twoFactorService.isTwoFactorCodeValid(body.code, user);
        if (!isCodeValid) {
            throw new BadRequestException('Código de verificación inválido');
        }

        return this.authService.loginWith2FA(user);
    }
}
