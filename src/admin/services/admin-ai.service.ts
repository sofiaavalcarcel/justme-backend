import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Professional } from '../../professionals/entities/professional.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Transaction } from '../../wallet/entities/transaction.entity';
import { Service } from '../../services/entities/service.entity';
import { AIProviderManager } from '../../modules/ai/providers/ai-provider.manager';
import { RedisCacheService } from '../../modules/ai/providers/redis-cache.service';
import type { BusinessMetrics, AiInsight, AiAlert, ChatResponse } from '../dto/ai.dto';

/**
 * AdminAiService
 * ───────────────
 * All heavy analytics: TypeScript (0 tokens).
 * AI layer: only for humanizing / summarizing (via AIProviderManager).
 * Redis cache reduces repeated DB hits and API costs.
 */
@Injectable()
export class AdminAiService {
  private readonly logger = new Logger(AdminAiService.name);

  // ── Redis Cache TTLs ──────────────────────────────
  private readonly METRICS_TTL = 60;   // 1 min
  private readonly INSIGHTS_TTL = 300; // 5 min
  private readonly CHAT_TTL = 30;      // 30 sec

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Professional) private proRepo: Repository<Professional>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    @InjectRepository(Service) private serviceRepo: Repository<Service>,
    private readonly aiManager: AIProviderManager,
    private readonly redis: RedisCacheService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────

  async getMetrics(): Promise<BusinessMetrics> {
    const cached = await this.redis.get<BusinessMetrics>('admin:ai:metrics');
    if (cached) return cached;

    const data = await this.computeMetrics();
    await this.redis.set('admin:ai:metrics', data, this.METRICS_TTL);
    return data;
  }

  async getInsights(): Promise<{ insights: AiInsight[]; source: string }> {
    const cached = await this.redis.get<{ insights: AiInsight[]; source: string }>('admin:ai:insights:v4');
    if (cached) return cached;

    const metrics = await this.getMetrics();
    const { insights, source } = await this.aiManager.getInsights(metrics);
    
    await this.redis.set('admin:ai:insights:v4', { insights, source }, this.INSIGHTS_TTL);
    this.logger.log(`Insights generated — source: ${source}`);
    return { insights, source };
  }

  async getAlerts(): Promise<AiAlert[]> {
    const metrics = await this.getMetrics();
    return this.aiManager.getAlerts(metrics);
  }

  async chat(message: string): Promise<ChatResponse> {
    const intent = this.detectIntent(message.toLowerCase());
    
    const cacheKey = `admin:ai:chat:${intent}`;
    const cached = await this.redis.get<ChatResponse>(cacheKey);
    if (cached) return cached;

    const metrics = await this.getMetrics();
    const { reply, source } = await this.aiManager.getChatReply(intent, metrics, message);
    
    const response = { reply, source, intent };
    await this.redis.set(cacheKey, response, this.CHAT_TTL);
    return response;
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: ANALYTICS ENGINE (TypeScript only)
  // ─────────────────────────────────────────────────────────

  private async computeMetrics(): Promise<BusinessMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sixtyDaysAgo  = new Date(now.getTime() - 60 * 86_400_000);

    const [totalBookings, completedBookings, cancelledBookings, pendingBookings, totalUsers, totalProfessionals] =
      await Promise.all([
        this.bookingRepo.count(),
        this.bookingRepo.count({ where: { status: 'completed' as any } }),
        this.bookingRepo.count({ where: { status: 'cancelled' as any } }),
        this.bookingRepo.count({ where: { status: 'pending' as any } }),
        this.userRepo.count(),
        this.proRepo.count(),
      ]);

    const [revenueRaw, ratingRaw, topServiceRaw, activeProsRaw, highCancelRaw, recentUsersRaw, prevUsersRaw, activeUsersRaw] =
      await Promise.all([
        this.transactionRepo.createQueryBuilder('t')
          .select("SUM(CASE WHEN t.type='payment' AND t.status='completed' THEN t.amount ELSE 0 END)", 'rev')
          .getRawOne(),
        this.proRepo.createQueryBuilder('p').select('AVG(p.averageRating)', 'avg').where('p.averageRating > 0').getRawOne(),
        this.bookingRepo.createQueryBuilder('b')
          .leftJoin('b.professionalService', 'ps').leftJoin('ps.service', 'svc')
          .select('svc.name', 'name').addSelect('COUNT(b.id)', 'cnt')
          .groupBy('svc.name').orderBy('cnt', 'DESC').limit(1).getRawOne(),
        this.bookingRepo.createQueryBuilder('b')
          .select('b.professionalId').where('b.createdAt >= :d', { d: thirtyDaysAgo })
          .andWhere("b.status IN ('confirmed','completed')").groupBy('b.professionalId').getRawMany(),
        this.bookingRepo.createQueryBuilder('b')
          .select('b.userId').addSelect('COUNT(b.id)', 'cnt')
          .where("b.status = 'cancelled'").groupBy('b.userId').having('COUNT(b.id) >= 3').getRawMany(),
        this.userRepo.createQueryBuilder('u').where('u.createdAt >= :d', { d: thirtyDaysAgo }).getCount(),
        this.userRepo.createQueryBuilder('u').where('u.createdAt >= :s AND u.createdAt < :e', { s: sixtyDaysAgo, e: thirtyDaysAgo }).getCount(),
        this.userRepo.createQueryBuilder('u').where('u.createdAt >= :d', { d: thirtyDaysAgo }).getCount(),
      ]);

    const activeProfessionals = activeProsRaw.length;
    const recentGrowth = prevUsersRaw > 0 ? Math.round(((recentUsersRaw - prevUsersRaw) / prevUsersRaw) * 100) : (recentUsersRaw > 0 ? 100 : 0);

    return {
      totalBookings, completedBookings, cancelledBookings, pendingBookings,
      totalRevenue: parseFloat(revenueRaw?.rev) || 0,
      totalUsers,
      activeUsers: activeUsersRaw,
      totalProfessionals,
      activeProfessionals,
      avgRating: parseFloat(ratingRaw?.avg) || 0,
      topService: topServiceRaw?.name ?? 'N/A',
      cancelRate:  totalBookings > 0 ? Math.round((cancelledBookings  / totalBookings) * 100) : 0,
      bookingRate: totalBookings > 0 ? Math.round((completedBookings  / totalBookings) * 100) : 0,
      recentGrowth,
      inactiveProCount: Math.max(0, totalProfessionals - activeProfessionals),
      highCancelUserCount: highCancelRaw.length,
    };
  }

  private detectIntent(msg: string): string {
    if (msg.match(/reservas?|citas?|booking/))       return 'bookings';
    if (msg.match(/ingreso|revenue|dinero|gana/))     return 'revenue';
    if (msg.match(/usuario|cliente|user/))            return 'users';
    if (msg.match(/profesional|pro\b|especialista/))  return 'professionals';
    if (msg.match(/servicio|service|popular/))        return 'services';
    if (msg.match(/cancel/))                          return 'cancellations';
    if (msg.match(/rating|calificac|estrella/))       return 'ratings';
    return 'general';
  }
}
