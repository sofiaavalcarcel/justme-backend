import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';
import { ProfessionalsService } from '../../professionals/services/professionals.service';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review) private reviewRepo: Repository<Review>,
        @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
        private professionalsService: ProfessionalsService,
    ) {}

    async create(userId: number, data: { professionalId: number; bookingId?: number; rating: number; comment?: string }) {
        // Verify the booking is completed if bookingId is provided
        if (data.bookingId) {
            const booking = await this.bookingRepo.findOne({ where: { id: data.bookingId } });
            if (!booking || booking.status !== BookingStatus.COMPLETED) {
                throw new BadRequestException('Can only review completed bookings');
            }
            if (booking.userId !== userId) {
                throw new BadRequestException('You can only review your own bookings');
            }
        }

        // Check for duplicate review
        const existing = await this.reviewRepo.findOne({
            where: { userId, professionalId: data.professionalId, bookingId: data.bookingId },
        });
        if (existing) throw new BadRequestException('You have already reviewed this booking');

        const review = this.reviewRepo.create({ userId, ...data });
        const saved = await this.reviewRepo.save(review);

        // Update professional rating
        await this.professionalsService.updateRating(data.professionalId);

        return saved;
    }

    async findByProfessional(professionalId: number) {
        return this.reviewRepo.find({
            where: { professionalId },
            relations: ['user', 'booking', 'booking.professionalService'],
            order: { createdAt: 'DESC' },
        });
    }

    async findByUser(userId: number) {
        return this.reviewRepo.find({
            where: { userId },
            relations: ['professional', 'professional.user'],
            order: { createdAt: 'DESC' },
        });
    }
}
