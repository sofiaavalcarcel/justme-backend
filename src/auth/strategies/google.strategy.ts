import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import type { ConfigType } from '@nestjs/config';
import config from '../../config';
import { UsersService } from '../../users/services/users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        @Inject(config.KEY) private readonly configService: ConfigType<typeof config>,
        private readonly usersService: UsersService,
    ) {
        super({
            clientID: configService.google.clientId as string,
            clientSecret: configService.google.clientSecret as string,
            callbackURL: configService.google.callbackUrl as string,
            scope: ['email', 'profile'],
        } as any);
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
        try {
            const user = await this.usersService.findOrCreateGoogleUser(profile);
            done(null, user);
        } catch (error) {
            done(error, false);
        }
    }
}
