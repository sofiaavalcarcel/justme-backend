import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../entities/coupon.entity';
import { IncentiveProgram } from '../entities/incentive-program.entity';

@Injectable()
export class CouponsService {
    constructor(
        @InjectRepository(Coupon) private couponRepo: Repository<Coupon>,
        @InjectRepository(IncentiveProgram) private incentiveRepo: Repository<IncentiveProgram>,
    ) {}

    async getUserCoupons(userId: number) {
        return this.couponRepo.find({
            where: [
                { userId, isUsed: false },
                { userId: undefined as any, isUsed: false }, // global coupons
            ],
            order: { expiresAt: 'ASC' },
        });
    }

    async validateCoupon(code: string, userId: number) {
        const coupon = await this.couponRepo.findOne({
            where: { code, isUsed: false },
        });

        if (!coupon) return { valid: false, message: 'Invalid or expired coupon' };

        const now = new Date();
        const expiresAt = new Date(coupon.expiresAt);
        if (expiresAt < now) return { valid: false, message: 'Coupon has expired' };

        if (coupon.userId && coupon.userId !== userId) {
            return { valid: false, message: 'Coupon not valid for this user' };
        }

        return { valid: true, coupon };
    }

    async useCoupon(couponId: number) {
        await this.couponRepo.update(couponId, { isUsed: true });
    }

    async generateCouponForUser(userId: number, discount: number, description: string) {
        const code = `JM${discount}-${Date.now().toString(36).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 3); // 3 months validity

        const coupon = this.couponRepo.create({
            code,
            discount,
            description,
            expiresAt: expiresAt.toISOString().split('T')[0],
            userId,
        });

        return this.couponRepo.save(coupon);
    }

    async checkMilestoneReward(userId: number, completedBookings: number) {
        const milestones = [
            { count: 5, discount: 15, desc: 'Complete 5 services reward!' },
            { count: 10, discount: 20, desc: 'Loyal customer! 10 services completed.' },
            { count: 20, discount: 30, desc: 'Super customer! 20 services milestone.' },
        ];

        for (const milestone of milestones) {
            if (completedBookings === milestone.count) {
                return this.generateCouponForUser(userId, milestone.discount, milestone.desc);
            }
        }
        return null;
    }

    // Incentive Programs
    async getActiveIncentives() {
        return this.incentiveRepo.find({ where: { isActive: true } });
    }

    async createIncentive(data: Partial<IncentiveProgram>) {
        const incentive = this.incentiveRepo.create(data);
        return this.incentiveRepo.save(incentive);
    }
}
