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

        // Revenue calculation — only completed transactions
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

        const includeUsers    = !type || type === 'registration';
        const includeBookings = !type || type === 'booking';

        // Positional params array: [startDate?, endDate?, limit, skip]
        const params: any[] = [];
        let startCond = '';
        let endCond   = '';

        if (startDate) { params.push(startDate); startCond = `AND "createdAt" >= $${params.length}`; }
        if (endDate)   { params.push(endDate);   endCond   = `AND "createdAt" <= $${params.length}`; }

        const parts: string[] = [];

        if (includeUsers) {
            parts.push(`
                SELECT
                    CONCAT('user-', u.id::text)                                        AS id,
                    'registration'::text                                               AS type,
                    u."createdAt"                                                      AS timestamp,
                    TRIM(CONCAT(u.name, ' ', COALESCE(u."lastName", '')))              AS user_name,
                    u.avatar                                                           AS user_avatar,
                    TRIM(CONCAT(u.name, ' ', COALESCE(u."lastName", ''))) || ' se ha unido a JustMe' AS description
                FROM "user" u
                WHERE 1=1 ${startCond} ${endCond}
            `);
        }

        if (includeBookings) {
            parts.push(`
                SELECT
                    CONCAT('booking-', b.id::text)                                     AS id,
                    'booking'::text                                                    AS type,
                    b."createdAt"                                                      AS timestamp,
                    TRIM(CONCAT(u2.name, ' ', COALESCE(u2."lastName", '')))            AS user_name,
                    u2.avatar                                                          AS user_avatar,
                    TRIM(CONCAT(u2.name, ' ha reservado ', COALESCE(svc.name, 'un servicio'))) AS description
                FROM bookings b
                LEFT JOIN "user" u2  ON u2.id = b."userId"
                LEFT JOIN professional_services ps ON ps.id = b."professionalServiceId"
                LEFT JOIN services svc ON svc.id = ps."serviceId"
                WHERE 1=1 ${startCond} ${endCond}
            `);
        }

        if (parts.length === 0) {
            return { data: [], total: 0, page, limit, totalPages: 0 };
        }

        const union = parts.join(' UNION ALL ');

        const countResult = await this.bookingRepo.query(
            `SELECT COUNT(*) AS total FROM (${union}) AS combined`,
            params,
        );
        const total = parseInt(countResult[0]?.total) || 0;

        params.push(limit);
        params.push(skip);

        const data: any[] = await this.bookingRepo.query(
            `SELECT * FROM (${union}) AS combined ORDER BY timestamp DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params,
        );

        return {
            data: data.map((r) => ({
                id:         r.id,
                type:       r.type,
                description: r.description,
                timestamp:  r.timestamp,
                userName:   (r.user_name ?? '').trim(),
                userAvatar: r.user_avatar ?? null,
                title:      r.type === 'registration' ? 'Nuevo Registro' : 'Nueva Reserva',
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getMonthlyRevenue() {
        const months = Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - 11 + i);
            return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('es', { month: 'short' }) };
        });

        const results = await Promise.all(months.map(async ({ year, month, label }) => {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0, 23, 59, 59);
            const res = await this.transactionRepo
                .createQueryBuilder('t')
                .select('COALESCE(SUM(t.amount), 0)', 'revenue')
                .addSelect('COUNT(t.id)', 'count')
                .where("t.type = 'payment'")
                .andWhere("t.status = 'completed'")
                .andWhere('t.createdAt BETWEEN :start AND :end', { start, end })
                .getRawOne();
            return {
                label,
                revenue: parseFloat(res?.revenue) || 0,
                bookings: parseInt(res?.count) || 0,
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

    async getBookings(page = 1, limit = 10, filters: { status?: string; search?: string } = {}) {
        const skip = (page - 1) * limit;

        let qb = this.bookingRepo.createQueryBuilder('b')
            .leftJoinAndSelect('b.user', 'u')
            .leftJoinAndSelect('b.professional', 'pro')
            .leftJoinAndSelect('pro.user', 'proUser')
            .leftJoinAndSelect('b.professionalService', 'ps')
            .leftJoinAndSelect('ps.service', 'svc')
            .orderBy('b.date', 'DESC')
            .addOrderBy('b.startTime', 'DESC');

        if (filters.status) {
            qb = qb.where('b.status = :status', { status: filters.status });
        }

        if (filters.search) {
            const search = `%${filters.search}%`;
            const condition = filters.status ? 'andWhere' : 'where';
            qb = qb[condition](
                '(LOWER(u.name) LIKE LOWER(:s) OR LOWER(u."lastName") LIKE LOWER(:s) OR LOWER(proUser.name) LIKE LOWER(:s))',
                { s: search }
            );
        }

        const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

        // Stats always over all bookings
        const statsRaw = await this.bookingRepo.createQueryBuilder('b')
            .select('b.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .addSelect('SUM(b.price)', 'total')
            .groupBy('b.status')
            .getRawMany();

        const stats = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0 };
        for (const row of statsRaw) {
            const count = parseInt(row.count) || 0;
            const sum = parseFloat(row.total) || 0;
            stats.total += count;
            if (row.status === 'pending') stats.pending = count;
            if (row.status === 'confirmed') stats.confirmed = count;
            if (row.status === 'completed') { stats.completed = count; stats.revenue += sum; }
            if (row.status === 'cancelled') stats.cancelled = count;
        }

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
        await this.bookingRepo.update(id, { status: status as any });
        return this.bookingRepo.findOne({
            where: { id },
            relations: ['user', 'professional', 'professional.user', 'professionalService', 'professionalService.service'],
        });
    }
}
