import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    ) {}

    async send(
        userId: number,
        title: string,
        message: string,
        type: NotificationType = NotificationType.SYSTEM,
        data?: Record<string, any>,
    ) {
        const notification = this.notifRepo.create({
            userId,
            title,
            message,
            type,
            data,
        });
        return this.notifRepo.save(notification);
    }

    async getUserNotifications(userId: number) {
        return this.notifRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }

    async markAsRead(id: number) {
        await this.notifRepo.update(id, { isRead: true });
        return { success: true };
    }

    async markAllAsRead(userId: number) {
        await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
        return { success: true };
    }

    async getUnreadCount(userId: number): Promise<number> {
        return this.notifRepo.count({ where: { userId, isRead: false } });
    }

    async deleteAll(userId: number) {
        await this.notifRepo.delete({ userId });
        return { success: true };
    }
}
