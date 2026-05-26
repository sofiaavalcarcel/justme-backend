import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/services/users/users.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        private configService: ConfigService,
        private userService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
            secretOrKey: configService.get<string>('config.jwt.refreshSecret')!,
        });
    }

    async validate(payload: { sub: number; email: string }) {
        const user = await this.userService.findOne(payload.sub);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        const { password, refreshToken, ...result } = user;
        return result;
    }
}
