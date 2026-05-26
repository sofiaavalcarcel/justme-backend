import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) {}

    async sendPasswordResetEmail(user: { name: string; email: string }, token: string) {
        await this.mailerService.sendMail({
            to: user.email,
            subject: '🔐 Recupera tu contraseña — JustMe',
            template: 'reset-password',
            context: {
                name: user.name,
                token,
                year: new Date().getFullYear(),
            },
        });
    }
}
