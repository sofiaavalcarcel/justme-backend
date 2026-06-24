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

    async sendApplicationResult(user: { name: string; email: string }, status: 'approved' | 'rejected', adminMessage: string) {
        await this.mailerService.sendMail({
            to: user.email,
            subject: status === 'approved'
                ? '🎉 ¡Bienvenido a JustMe! Tu solicitud ha sido aprobada'
                : '📄 Actualización sobre tu solicitud en JustMe',
            template: 'application-result',
            context: {
                name: user.name,
                isApproved: status === 'approved',
                adminMessage,
                year: new Date().getFullYear(),
            },
        });
    }
}
