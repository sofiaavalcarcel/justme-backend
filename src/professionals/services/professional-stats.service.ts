import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../wallet/entities/transaction.entity';
import { IncentiveProgram } from '../../coupons/entities/incentive-program.entity';
import { Professional } from '../entities/professional.entity';

@Injectable()
export class ProfessionalStatsService {
    constructor(
        @InjectRepository(Professional) private proRepo: Repository<Professional>,
        @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
        @InjectRepository(Review) private reviewRepo: Repository<Review>,
        @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
        @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
        @InjectRepository(IncentiveProgram) private incentiveRepo: Repository<IncentiveProgram>,
    ) {}

    async getStats(professionalId: number) {
        const now = new Date();
        
        // Helper to get YYYY-MM-DD in local time
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const todayStr = formatDate(now);

        // Start of week (Monday)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        const startOfWeekStr = formatDate(startOfWeek);

        // End of week (Sunday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const endOfWeekStr = formatDate(endOfWeek);

        // Start of month
        const startOfMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        const endOfMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

        // Start of previous month
        const startOfPrevMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        const endOfPrevMonthStr = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));

        // ── Parallel queries ──
        const [
            professional,
            allBookings,
            todayBookings,
            weekBookings,
            monthBookings,
            prevMonthBookings,
            recentReviews,
            wallet,
            activeIncentive,
        ] = await Promise.all([
            // Professional profile
            this.proRepo.findOne({ where: { id: professionalId } }),

            // All bookings (for total clients & total bookings)
            this.bookingRepo.find({
                where: { professionalId },
                relations: ['professionalService', 'professionalService.service'],
            }),

            // Today's bookings
            this.bookingRepo.count({
                where: {
                    professionalId,
                    date: todayStr,
                    status: In([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                },
            }),

            // This week's bookings
            this.bookingRepo.find({
                where: {
                    professionalId,
                    date: Between(startOfWeekStr, endOfWeekStr),
                },
                relations: ['professionalService', 'professionalService.service'],
            }),

            // This month's completed bookings (earnings)
            this.bookingRepo.find({
                where: {
                    professionalId,
                    date: Between(startOfMonthStr, endOfMonthStr),
                    status: BookingStatus.COMPLETED,
                },
            }),

            // Previous month's completed bookings (trend)
            this.bookingRepo.find({
                where: {
                    professionalId,
                    date: Between(startOfPrevMonthStr, endOfPrevMonthStr),
                    status: BookingStatus.COMPLETED,
                },
            }),

            // Recent reviews (last 5)
            this.reviewRepo.find({
                where: { professionalId },
                relations: ['user'],
                order: { createdAt: 'DESC' },
                take: 5,
            }),

            // Wallet balance
            this.walletRepo.findOne({ where: { professionalId } }),

            // Active incentive program
            this.incentiveRepo.findOne({ where: { isActive: true } }),
        ]);

        // ── Calculations ──

        // Total unique clients
        const uniqueUserIds = new Set(allBookings.map(b => b.userId));
        const totalClients = uniqueUserIds.size;

        // Total & completed bookings
        const totalBookings = allBookings.length;
        const completedBookings = allBookings.filter(b => b.status === BookingStatus.COMPLETED).length;
        const completionRate = totalBookings > 0
            ? Math.round((completedBookings / totalBookings) * 100)
            : 0;

        // Weekly earnings (from completed bookings this week)
        const weeklyCompletedBookings = weekBookings.filter(b => b.status === BookingStatus.COMPLETED);
        const weeklyEarnings = weeklyCompletedBookings.reduce((sum, b) => sum + Number(b.price), 0);

        // Monthly earnings
        const monthlyEarnings = monthBookings.reduce((sum, b) => sum + Number(b.price), 0);
        const previousMonthEarnings = prevMonthBookings.reduce((sum, b) => sum + Number(b.price), 0);

        // Monthly trend
        const monthlyTrend = previousMonthEarnings > 0
            ? Math.round(((monthlyEarnings - previousMonthEarnings) / previousMonthEarnings) * 1000) / 10
            : monthlyEarnings > 0 ? 100 : 0;

        // Weekly bookings by day (Mon=0 .. Sun=6) for chart
        const weeklyBookingsByDay = [0, 0, 0, 0, 0, 0, 0];
        const weeklyEarningsByDay = [0, 0, 0, 0, 0, 0, 0];
        weekBookings.forEach(b => {
            // Use T12:00:00 to avoid timezone shifts during getDay()
            const d = new Date(b.date + 'T12:00:00');
            const dayIdx = (d.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
            
            weeklyBookingsByDay[dayIdx]++;
            if (b.status === BookingStatus.COMPLETED) {
                weeklyEarningsByDay[dayIdx] += Number(b.price);
            }
        });

        // Top services (from all completed bookings)
        const serviceMap = new Map<string, { bookings: number; revenue: number }>();
        allBookings
            .filter(b => b.status === BookingStatus.COMPLETED)
            .forEach(b => {
                const name = b.professionalService?.service?.name || 'Unknown';
                const entry = serviceMap.get(name) || { bookings: 0, revenue: 0 };
                entry.bookings++;
                entry.revenue += Number(b.price);
                serviceMap.set(name, entry);
            });

        const topServices = Array.from(serviceMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Incentive progress
        const incentive = activeIncentive ? {
            id: activeIncentive.id,
            title: activeIncentive.title,
            description: activeIncentive.description,
            targetServices: activeIncentive.targetServices,
            currentServices: professional?.completedServices || 0,
            rewardValue: Number(activeIncentive.rewardValue),
            rewardType: activeIncentive.rewardType,
        } : null;

        return {
            todayBookings,
            weeklyEarnings: Math.round(weeklyEarnings * 100) / 100,
            monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
            previousMonthEarnings: Math.round(previousMonthEarnings * 100) / 100,
            monthlyTrend,
            totalBookings,
            completedBookings,
            completionRate,
            totalClients,
            averageRating: professional ? Number(professional.averageRating) : 0,
            reviewCount: professional?.reviewCount || 0,
            walletBalance: wallet ? Number(wallet.balance) : 0,
            walletCurrency: wallet?.currency || 'USD',
            weeklyBookingsByDay,
            weeklyEarningsByDay,
            topServices,
            recentReviews: recentReviews.map(r => ({
                id: r.id,
                rating: Number(r.rating),
                comment: r.comment,
                createdAt: r.createdAt,
                userName: r.user?.name || 'Anonymous',
                userAvatar: r.user?.avatar || null,
            })),
            incentive,
        };
    }
}
