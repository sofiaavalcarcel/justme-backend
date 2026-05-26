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
        // Get service duration
        const proService = await this.proServiceRepo.findOne({
            where: { id: dto.professionalServiceId },
            relations: ['service'],
        });
        if (!proService) throw new NotFoundException('Professional service not found');

        // Calculate end time
        const endTime = this.addMinutes(dto.startTime, proService.duration);

        // Retrieve professional to get bufferTime
        const professional = await this.professionalsService.findOne(dto.professionalId);
        const bufferTime = professional?.bufferTime !== undefined ? Number(professional.bufferTime) : 15;

        // Check for conflicting bookings
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

        // Spatial Validation (Only check radius if the professional is traveling to the user's home)
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

        // Create booking (auto-confirmed)
        const booking = this.bookingRepo.create({
            userId,
            professionalId: dto.professionalId,
            professionalServiceId: dto.professionalServiceId,
            date: dto.date,
            startTime: dto.startTime,
            endTime,
            price: proService.price,
            location: dto.location,
            locationType: dto.locationType,
            latitude: dto.latitude,
            longitude: dto.longitude,
            status: BookingStatus.PENDING,
        });

        const saved = await this.bookingRepo.save({
            ...booking,
            status: BookingStatus.PENDING,
        });

        // Notify professional
        // const professional = await this.professionalsService.findOne(dto.professionalId);
        await this.notificationsService.send(
            professional.userId,
            'Nueva Reserva',
            `Tienes una nueva reserva para ${proService.service?.name || 'servicio'} el ${dto.date} a las ${dto.startTime}`,
            NotificationType.BOOKING,
            { bookingId: saved.id },
        );

        return saved;
    }

    async findUserBookings(userId: number) {
        return this.bookingRepo.find({
            where: { userId },
            relations: ['professional', 'professional.user', 'professionalService', 'professionalService.service'],
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

        // Get service duration to recalculate endTime
        const proService = await this.proServiceRepo.findOne({
            where: { id: booking.professionalServiceId },
            relations: ['service'],
        });
        const duration = proService?.duration || 60;
        const endTime = this.addMinutes(startTime, duration);

        // Retrieve professional to get bufferTime
        const professional = await this.professionalsService.findOne(booking.professionalId);
        const bufferTime = professional?.bufferTime !== undefined ? Number(professional.bufferTime) : 15;

        // Check for conflicting bookings (exclude current booking)
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

        if (status === BookingStatus.COMPLETED) {
            await this.professionalsService.incrementCompletedServices(booking.professionalId);
        }

        return this.bookingRepo.save(booking);
    }

    private addMinutes(time: string, minutes: number): string {
        const [h, m] = time.split(':').map(Number);
        const totalMinutes = h * 60 + (m || 0) + minutes;
        const newH = Math.floor(totalMinutes / 60);
        const newM = totalMinutes % 60;
        return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    }
}
