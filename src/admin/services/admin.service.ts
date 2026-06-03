import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Professional } from '../../professionals/entities/professional.entity';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';
import { Transaction } from '../../wallet/entities/transaction.entity';
import { Service } from '../../services/entities/service.entity';
import { BookingsService } from '../../bookings/services/bookings.service';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Professional) private proRepo: Repository<Professional>,
        @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
        @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
        @InjectRepository(Service) private serviceRepo: Repository<Service>,
        private readonly bookingsService: BookingsService,
    ) {}

    async getDashboardStats() {
        const [totalUsers, totalProfessionals, totalBookings, activeServices] = await Promise.all([
            this.userRepo.count(),
            this.proRepo.count(),
            this.bookingRepo.count(),
            this.serviceRepo.count({ where: { isActive: true } }),
        ]);

        // Revenue calculation
        const revenueResult = await this.transactionRepo
            .createQueryBuilder('t')
            .select('SUM(CASE WHEN t.type = \'TOP_UP\' THEN t.amount ELSE 0 END)', 'totalRevenue')
            .addSelect('SUM(CASE WHEN t.type = \'COMMISSION\' THEN ABS(t.amount) ELSE 0 END)', 'commissionsCollected')
            .getRawOne();

        // Average rating
        const ratingResult = await this.proRepo
            .createQueryBuilder('p')
            .select('AVG(p.averageRating)', 'avgRating')
            .where('p.averageRating > 0')
            .getRawOne();

        return {
            totalUsers,
            totalProfessionals,
            totalBookings,
            totalRevenue: parseFloat(revenueResult?.totalRevenue) || 0,
            commissionsCollected: parseFloat(revenueResult?.commissionsCollected) || 0,
            activeServices,
            avgRating: parseFloat(ratingResult?.avgRating) || 0,
        };
    }

    async getBookings(page: number = 1, limit: number = 10, filters: { status?: string; search?: string } = {}) {
        const { status, search } = filters;

        const queryBuilder = this.bookingRepo.createQueryBuilder('booking')
            .leftJoinAndSelect('booking.user', 'user')
            .leftJoinAndSelect('booking.professional', 'professional')
            .leftJoinAndSelect('professional.user', 'proUser')
            .leftJoinAndSelect('booking.professionalService', 'ps')
            .leftJoinAndSelect('ps.service', 'svc');

        if (status) {
            queryBuilder.andWhere('booking.status = :status', { status });
        }

        if (search) {
            queryBuilder.andWhere(
                '(user.name ILIKE :search OR user.lastName ILIKE :search OR proUser.name ILIKE :search OR svc.name ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        queryBuilder
            .orderBy('booking.date', 'DESC')
            .addOrderBy('booking.startTime', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        // Stats calculation
        const [totalAll, pending, completed, cancelled] = await Promise.all([
            this.bookingRepo.count(),
            this.bookingRepo.count({ where: { status: BookingStatus.PENDING } }),
            this.bookingRepo.count({ where: { status: BookingStatus.COMPLETED } }),
            this.bookingRepo.count({ where: { status: BookingStatus.CANCELLED } }),
        ]);

        const revenueResult = await this.bookingRepo
            .createQueryBuilder('b')
            .select('SUM(b.price)', 'revenue')
            .where('b.status = :status', { status: BookingStatus.COMPLETED })
            .getRawOne();
        const revenue = parseFloat(revenueResult?.revenue) || 0;

        const stats = {
            total: totalAll,
            pending,
            completed,
            cancelled,
            revenue,
        };

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            stats,
        };
    }

    async updateBookingStatus(id: number, status: string) {
        return this.bookingsService.updateStatus(id, status as BookingStatus);
    }

    async getUsers(page: number = 1, limit: number = 20, search?: string) {
        const where = search ? [
            { name: ILike(`%${search}%`) },
            { lastName: ILike(`%${search}%`) },
            { email: ILike(`%${search}%`) }
        ] : {};

        const [data, total] = await this.userRepo.findAndCount({
            where,
            relations: ['roles'],
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getProfessionals(page: number = 1, limit: number = 20, search?: string) {
        const where = search ? [
            { user: { name: ILike(`%${search}%`) } },
            { user: { lastName: ILike(`%${search}%`) } },
            { user: { email: ILike(`%${search}%`) } }
        ] : {};

        const [data, total] = await this.proRepo.findAndCount({
            where,
            relations: ['user', 'professionalServices', 'professionalServices.service'],
            skip: (page - 1) * limit,
            take: limit,
            order: { joinDate: 'DESC' },
        });
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getTransactions(page: number = 1, limit: number = 20) {
        const [data, total] = await this.transactionRepo.findAndCount({
            relations: ['wallet', 'wallet.professional', 'wallet.professional.user'],
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async toggleUserStatus(userId: number) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) return null;
        user.isActive = !user.isActive;
        return this.userRepo.save(user);
    }

    async updateUser(id: number, data: any) {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) return null;
        
        // No permitimos actualizar el password por aquí por seguridad
        delete data.password;
        
        this.userRepo.merge(user, data);
        return this.userRepo.save(user);
    }

    async getServices() {
        return this.serviceRepo.find();
    }

    async updateService(id: number, data: any) {
        const service = await this.serviceRepo.findOne({ where: { id } });
        if (!service) return null;
        this.serviceRepo.merge(service, data);
        return this.serviceRepo.save(service);
    }

    async updateProfessional(id: number, data: any) {
        const pro = await this.proRepo.findOne({ where: { id }, relations: ['user'] });
        if (!pro) return null;

        // Si data contiene información del usuario (name, email, etc), la extraemos
        if (data.user && pro.user) {
            this.userRepo.merge(pro.user, data.user);
            await this.userRepo.save(pro.user);
            delete data.user;
        } else if (data.name || data.lastName || data.email) {
            // Manejo alternativo si el frontend envía los campos planos
            const { name, lastName, email, phone, ...proData } = data;
            const userData: any = {};
            if (name !== undefined) userData.name = name;
            if (lastName !== undefined) userData.lastName = lastName;
            if (email !== undefined) userData.email = email;
            if (phone !== undefined) userData.phone = phone;

            if (Object.keys(userData).length > 0 && pro.user) {
                this.userRepo.merge(pro.user, userData);
                await this.userRepo.save(pro.user);
            }
            data = proData;
        }

        this.proRepo.merge(pro, data);
        return this.proRepo.save(pro);
    }

    async verifyProfessional(professionalId: number) {
        await this.proRepo.update(professionalId, { verified: true });
        return { success: true };
    }

    async getRecentActivity(page: number = 1, limit: number = 10, filters: any = {}) {
        const skip = (page - 1) * limit;
        const { type, startDate, endDate } = filters;

        const dateFilter = (qb: any, tableAlias: string) => {
            if (startDate) qb.andWhere(`${tableAlias}.createdAt >= :startDate`, { startDate });
            if (endDate) qb.andWhere(`${tableAlias}.createdAt <= :endDate`, { endDate });
        };

        const fetchUsers = async () => {
            if (type && type !== 'registration') return [[], 0];
            const qb = this.userRepo.createQueryBuilder('u').orderBy('u.createdAt', 'DESC');
            dateFilter(qb, 'u');
            return qb.getManyAndCount();
        };

        const fetchBookings = async () => {
            if (type && type !== 'booking') return [[], 0];
            const qb = this.bookingRepo.createQueryBuilder('b')
                .leftJoinAndSelect('b.user', 'user')
                .leftJoinAndSelect('b.professionalService', 'ps')
                .leftJoinAndSelect('ps.service', 'svc')
                .orderBy('b.createdAt', 'DESC');
            dateFilter(qb, 'b');
            return qb.getManyAndCount();
        };

        const [userRes, bookingRes] = await Promise.all([
            fetchUsers(),
            fetchBookings(),
        ]);

        const [users, userCount] = userRes as [any[], number];
        const [bookings, bookingCount] = bookingRes as [any[], number];

        const mappedUsers = users.map(u => ({
            id: `user-${u.id}`,
            type: 'registration',
            title: 'Nuevo Registro',
            description: `${u.name} ${u.lastName || ''}`.trim() + ' se ha unido a JustMe',
            timestamp: u.createdAt,
            userName: `${u.name} ${u.lastName || ''}`.trim(),
            userAvatar: u.avatar,
        }));

        const mappedBookings = bookings.map(b => ({
            id: `booking-${b.id}`,
            type: 'booking',
            title: 'Nueva Reserva',
            description: `${b.user?.name || 'Un cliente'} ha reservado ${b.professionalService?.service?.name || 'un servicio'}`,
            timestamp: b.createdAt,
            userName: `${b.user?.name || ''} ${b.user?.lastName || ''}`.trim(),
            userAvatar: b.user?.avatar,
        }));

        const allActivities = [...mappedUsers, ...mappedBookings]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        const total = (userCount as number) + (bookingCount as number);
        const data = allActivities.slice(skip, skip + limit);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getMonthlyRevenue() {
        const months = Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - 11 + i);
            return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('es', { month: 'short' }) };
        });

        const results = await Promise.all(months.map(async ({ year, month, label }) => {
            const start = `${year}-${String(month).padStart(2, '0')}-01`;
            const end = new Date(year, month, 0).toISOString().split('T')[0];
            const res = await this.bookingRepo
                .createQueryBuilder('b')
                .select('COALESCE(SUM(b.price), 0)', 'revenue')
                .addSelect('COUNT(b.id)', 'bookings')
                .where('b.date BETWEEN :start AND :end', { start, end })
                .andWhere('b.status = :status', { status: 'completed' })
                .getRawOne();
            return {
                label,
                revenue: parseFloat(res?.revenue) || 0,
                bookings: parseInt(res?.bookings) || 0,
            };
        }));

        return results;
    }

    async getAnalytics() {
        const [totalBookings, cancelledBookings, ratingResult] = await Promise.all([
            this.bookingRepo.count(),
            this.bookingRepo.count({ where: { status: 'cancelled' as any } }),
            this.proRepo
                .createQueryBuilder('p')
                .select('AVG(p.averageRating)', 'avgRating')
                .where('p.averageRating > 0')
                .getRawOne(),
        ]);

        const completedBookings = await this.bookingRepo.count({ where: { status: 'completed' as any } });

        // Growth: users registered in last 30 days vs previous 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
        const [recentUsers, prevUsers] = await Promise.all([
            this.userRepo.createQueryBuilder('u').where('u.createdAt >= :date', { date: thirtyDaysAgo }).getCount(),
            this.userRepo.createQueryBuilder('u').where('u.createdAt >= :start AND u.createdAt < :end', { start: sixtyDaysAgo, end: thirtyDaysAgo }).getCount(),
        ]);

        const monthlyGrowth = prevUsers > 0 ? Math.round(((recentUsers - prevUsers) / prevUsers) * 100) : (recentUsers > 0 ? 100 : 0);
        const bookingRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
        const cancelRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;

        return {
            avgRating: parseFloat(ratingResult?.avgRating) || 0,
            monthlyGrowth,
            bookingRate,
            cancelRate,
            totalBookings,
            completedBookings,
        };
    }
}
