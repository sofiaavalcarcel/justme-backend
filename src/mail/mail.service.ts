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
        // If template doesn't exist, it will fallback to plain HTML body if we don't have a template configured for it yet, but let's assume we have or we'll pass html directly.
        await this.mailerService.sendMail({
            to: user.email,
            subject: status === 'approved' 
                ? '🎉 ¡Bienvenido a JustMe! Tu solicitud ha sido aprobada' 
                : '📄 Actualización sobre tu solicitud en JustMe',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Hola ${user.name},</h2>
                    <p>Queremos informarte sobre el estado de tu solicitud para convertirte en Profesional en JustMe.</p>
                    <p>El estado de tu solicitud es: <strong>${status === 'approved' ? 'Aprobada' : 'Rechazada'}</strong></p>
                    ${adminMessage ? `<p><strong>Mensaje del equipo:</strong><br/>${adminMessage}</p>` : ''}
                    ${status === 'approved' 
                        ? '<p>Ya puedes acceder al panel de profesionales y configurar tus servicios y horarios.</p>' 
                        : '<p>Si tienes dudas, no dudes en contactarnos respondiendo a este correo.</p>'}
                    <p>Atentamente,<br/>El equipo de JustMe</p>
                </div>
            `,
        });
    }
}
