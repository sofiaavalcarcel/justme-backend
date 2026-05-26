import { AppDataSource } from '../database/data-source';
import { User } from '../users/entities/user.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

async function bootstrap() {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await AppDataSource.initialize();
        console.log('✅ Base de datos conectada.');

        const userRepo = AppDataSource.getRepository(User);
        const notificationRepo = AppDataSource.getRepository(Notification);

        // Buscar el usuario admin
        const adminEmail = 'admin@justme.com';
        const adminUser = await userRepo.findOne({ where: { email: adminEmail } });

        if (!adminUser) {
            console.error('❌ Usuario administrador no encontrado. Por favor corre el seed base primero.');
            return;
        }

        console.log(`👤 Insertando notificaciones para ${adminUser.email} (ID: ${adminUser.id})...`);

        const notificationsData = [
            {
                userId: adminUser.id,
                title: 'Nueva Reserva Agendada',
                message: 'El usuario Carlos Perez ha agendado un servicio de "Corte de Cabello" para mañana a las 10:00 AM.',
                type: NotificationType.BOOKING,
                isRead: false,
                data: { bookingId: 101 }
            },
            {
                userId: adminUser.id,
                title: 'Pago Recibido',
                message: 'Has recibido un pago de $50,000 COP por el servicio completado a Maria Lopez.',
                type: NotificationType.WALLET,
                isRead: false,
                data: { amount: 50000, currency: 'COP' }
            },
            {
                userId: adminUser.id,
                title: 'Nueva Reseña',
                message: '¡Felicidades! Has recibido una calificación de 5 estrellas por tu excelente servicio.',
                type: NotificationType.REVIEW,
                isRead: true,
                data: { rating: 5, reviewerName: 'Ana Gomez' }
            },
            {
                userId: adminUser.id,
                title: 'Actualización del Sistema',
                message: 'Se han realizado mejoras en el panel de administración para una mejor experiencia.',
                type: NotificationType.SYSTEM,
                isRead: false,
                data: { version: '2.1.0' }
            },
            {
                userId: adminUser.id,
                title: 'Reserva Cancelada',
                message: 'La reserva de "Manicura" con Julia Torres ha sido cancelada por el cliente.',
                type: NotificationType.BOOKING,
                isRead: false,
                data: { bookingId: 105, reason: 'Personal' }
            },
            {
                userId: adminUser.id,
                title: 'Bono de Bienvenida Reclamado',
                message: 'Un nuevo usuario ha utilizado el cupón "JUSTME2026".',
                type: NotificationType.SYSTEM,
                isRead: true,
                data: { couponCode: 'JUSTME2026' }
            }
        ];

        for (const data of notificationsData) {
            const notification = notificationRepo.create(data);
            await notificationRepo.save(notification);
        }

        console.log(`✅ ${notificationsData.length} notificaciones insertadas exitosamente.`);
        console.log('🎉 Proceso completado.');

    } catch (error) {
        console.error('❌ Error durante la inserción de notificaciones:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(0);
    }
}

bootstrap();
