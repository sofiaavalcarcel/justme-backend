import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus, LocationType } from '../entities/booking.entity';
import { ProfessionalService } from '../../services/entities/professional-service.entity';
import { CreateBookingDto } from '../dtos/booking.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { ProfessionalsService } from '../../professionals/services/professionals.service';
import { WalletService } from '../../wallet/services/wallet.service';

@Injectable()
export class BookingsService {
    constructor(
        @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
        @InjectRepository(ProfessionalService) private proServiceRepo: Repository<ProfessionalService>,
        private notificationsService: NotificationsService,
        private professionalsService: ProfessionalsService,
        private walletService: WalletService,
    ) { }

    async create(userId: number, dto: CreateBookingDto) {
        // ── 1. Balance check — block if professional has no operational funds ──
        const { canBook, balance } = await this.walletService.canAcceptBookings(dto.professionalId);
        if (!canBook) {
            throw new BadRequestException(
                `El profesional no puede recibir reservas en este momento (saldo operativo: $${balance.toLocaleString('es-CO')} COP).`,
            );
        }

        // ── 2. Get service details ────────────────────────────────────────────
        const proService = await this.proServiceRepo.findOne({
            where: { id: dto.professionalServiceId },
            relations: ['service'],
        });
        if (!proService) throw new NotFoundException('Professional service not found');

        const endTime = this.addMinutes(dto.startTime, proService.duration);

        // ── 3. Get professional + buffer time ────────────────────────────────
        const professional = await this.professionalsService.findOne(dto.professionalId);
        const bufferTime = professional?.bufferTime !== undefined ? Number(professional.bufferTime) : 15;

        // ── 4. Conflict check ─────────────────────────────────────────────────
        const conflict = await this.bookingRepo
            .createQueryBuilder('booking')
            .where('booking.professionalId = :proId', { proId: dto.professionalId })
            .andWhere('booking.date = :date', { date: dto.date })
            .andWhere('booking.status IN (:...statuses)', {
                statuses: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
            })
            .andWhere(
                '(booking.startTime < CAST(CAST(:endTime AS TIME) + CAST((:bufferTime || \' minutes\') AS INTERVAL) AS TIME) AND CAST(CAST(booking.endTime AS TIME) + CAST((:bufferTime || \' minutes\') AS INTERVAL) AS TIME) > CAST(:startTime AS TIME))',
                { startTime: dto.startTime, endTime, bufferTime },
            )
            .getOne();

        if (conflict) {
            throw new BadRequestException('Time slot conflicts with an existing booking');
        }

        // ── 5. Spatial validation ─────────────────────────────────────────────
        if (dto.locationType !== LocationType.PROFESSIONAL && dto.latitude !== undefined && dto.longitude !== undefined) {
            const { inRadius } = await this.professionalsService.isLocationInRadius(
                dto.professionalId,
                dto.latitude,
                dto.longitude,
            );
            if (!inRadius) {
                throw new BadRequestException('El profesional no presta servicios hasta tu ubicación de domicilio. Por favor, selecciona "Visitar Local".');
            }
        }

        // ── 6. Save booking ───────────────────────────────────────────────────
        const booking = await this.bookingRepo.save(
            this.bookingRepo.create({
                userId,
                professionalId:       dto.professionalId,
                professionalServiceId: dto.professionalServiceId,
                date:                 dto.date,
                startTime:            dto.startTime,
                endTime,
                price:                proService.price,
                location:             dto.location,
                locationType:         dto.locationType,
                latitude:             dto.latitude,
                longitude:            dto.longitude,
                status:               BookingStatus.PENDING,
            }),
        );

        // ── 7. Notify professional ────────────────────────────────────────────
        await this.notificationsService.send(
            professional.userId,
            'Nueva Reserva',
            `Tienes una nueva reserva para ${proService.service?.name || 'servicio'} el ${dto.date} a las ${dto.startTime}`,
            NotificationType.BOOKING,
            { bookingId: booking.id },
        );

        return booking;
    }

    async findUserBookings(userId: number) {
        return this.bookingRepo.find({
            where: { userId },
            relations: ['professional', 'professional.user', 'professionalService', 'professionalService.service', 'review'],
            order: { date: 'DESC', startTime: 'DESC' },
        });
    }

    async findProfessionalBookings(professionalId: number) {
        return this.bookingRepo.find({
            where: { professionalId },
            relations: ['user', 'professionalService', 'professionalService.service'],
            order: { date: 'DESC', startTime: 'DESC' },
        });
    }

    async findOne(id: number) {
        const booking = await this.bookingRepo.findOne({
            where: { id },
            relations: ['user', 'professional', 'professional.user', 'professionalService', 'professionalService.service'],
        });
        if (!booking) throw new NotFoundException(`Booking #${id} not found`);
        return booking;
    }

    async reschedule(id: number, date: string, startTime: string) {
        const booking = await this.findOne(id);

        if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
            throw new BadRequestException('Cannot reschedule a cancelled or completed booking');
        }

        const proService = await this.proServiceRepo.findOne({
            where: { id: booking.professionalServiceId },
            relations: ['service'],
        });
        const duration = proService?.duration || 60;
        const endTime = this.addMinutes(startTime, duration);

        const professional = await this.professionalsService.findOne(booking.professionalId);
        const bufferTime = professional?.bufferTime !== undefined ? Number(professional.bufferTime) : 15;

        const conflict = await this.bookingRepo
            .createQueryBuilder('booking')
            .where('booking.professionalId = :proId', { proId: booking.professionalId })
            .andWhere('booking.date = :date', { date })
            .andWhere('booking.id != :id', { id })
            .andWhere('booking.status IN (:...statuses)', {
                statuses: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
            })
            .andWhere(
                '(booking.startTime < CAST(CAST(:endTime AS TIME) + CAST((:bufferTime || \' minutes\') AS INTERVAL) AS TIME) AND CAST(CAST(booking.endTime AS TIME) + CAST((:bufferTime || \' minutes\') AS INTERVAL) AS TIME) > CAST(:startTime AS TIME))',
                { startTime, endTime, bufferTime },
            )
            .getOne();

        if (conflict) {
            throw new BadRequestException('The new time slot conflicts with an existing booking');
        }

        booking.date = date;
        booking.startTime = startTime;
        booking.endTime = endTime;

        return this.bookingRepo.save(booking);
    }

    async updateStatus(id: number, status: BookingStatus) {
        const booking = await this.findOne(id);
        booking.status = status;
        const saved = await this.bookingRepo.save(booking);

        if (status === BookingStatus.COMPLETED) {
            // Increment completed services counter
            await this.professionalsService.incrementCompletedServices(booking.professionalId);

            // Deduct 9% platform commission from operational balance
            await this.walletService.deductCommission(
                booking.id,
                booking.professionalId,
                Number(booking.price),
            );
        }

        return saved;
    }

    private addMinutes(time: string, minutes: number): string {
        const [h, m] = time.split(':').map(Number);
        const totalMinutes = h * 60 + (m || 0) + minutes;
        const newH = Math.floor(totalMinutes / 60);
        const newM = totalMinutes % 60;
        return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    }
}
