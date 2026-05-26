import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigType } from '@nestjs/config';
import config from '../config';
import { ModulesGuard } from './guards/modules.guard.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/auth.guard';
import { MailModule } from '../mail/mail.module';

import { TwoFactorService } from './services/two-factor.service';

@Module({
    imports: [
        UsersModule,
        PassportModule.register({ session: false }),
        MailModule,
        JwtModule.registerAsync({
            inject: [config.KEY],
            useFactory: (configType: ConfigType<typeof config>) => ({
                secret: configType.jwt.secret,
                signOptions: { expiresIn: configType.jwt.expiresIn },
            }),
        }),
    ],
    providers: [AuthService, ModulesGuard, RolesGuard, JwtAuthGuard, JwtStrategy, JwtRefreshStrategy, GoogleStrategy, TwoFactorService],
    controllers: [AuthController],
    exports: [AuthService, ModulesGuard, RolesGuard, JwtAuthGuard],
})
export class AuthModule { }
