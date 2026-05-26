import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleBreak } from '../entities/schedule-break.entity';
import { ScheduleException } from '../entities/schedule-exception.entity';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';

import { ProfessionalsService } from '../../professionals/services/professionals.service';
import { ServicesService } from '../../services/services/services.service';

@Injectable()
export class ScheduleService {
    constructor(
        @InjectRepository(Schedule) private scheduleRepo: Repository<Schedule>,
        @InjectRepository(ScheduleBreak) private breakRepo: Repository<ScheduleBreak>,
        @InjectRepository(ScheduleException) private exceptionRepo: Repository<ScheduleException>,
        @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
        @Inject(forwardRef(() => ProfessionalsService))
        private professionalsService: ProfessionalsService,
        private servicesService: ServicesService,
    ) {}

    async getSchedule(professionalId: number) {
        return this.scheduleRepo.find({
            where: { professionalId },
            relations: ['breaks'],
            order: { dayOfWeek: 'ASC' },
        });
    }

    async setSchedule(professionalId: number, scheduleData: {
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        isActive: boolean;
        breaks?: { title: string; startTime: string; endTime: string }[];
    }[]) {
        // Remove existing schedule
        await this.scheduleRepo.delete({ professionalId });

        const schedules = scheduleData.map((day) => {
            return this.scheduleRepo.create({
                professionalId,
                dayOfWeek: day.dayOfWeek,
                startTime: day.startTime,
                endTime: day.endTime,
                isActive: day.isActive,
            });
        });

        const savedSchedules = await this.scheduleRepo.save(schedules);

        // Save breaks linked to the saved schedules
        const allBreaks: any[] = [];
        scheduleData.forEach((day, index) => {
            const savedSchedule = savedSchedules[index];
            if (day.breaks && day.breaks.length > 0) {
                day.breaks.forEach((b) => {
                    allBreaks.push(
                        this.breakRepo.create({
                            ...b,
                            scheduleId: savedSchedule.id,
                        })
                    );
                });
            }
        });

        if (allBreaks.length > 0) {
            await this.breakRepo.save(allBreaks);
        }

        return this.getSchedule(professionalId);
    }

    async getAvailableSlots(
        professionalId: number, 
        date: string, 
        serviceId?: number, 
        latitude?: number, 
        longitude?: number,
        serviceDuration: number = 60
    ) {
        // Spatial Validation
        if (latitude !== undefined && longitude !== undefined) {
            const { inRadius } = await this.professionalsService.isLocationInRadius(
                professionalId,
                latitude,
                longitude,
            );
            if (!inRadius) {
                throw new BadRequestException('El profesional no presta servicios en esta ubicación específica');
            }
        }

        const dayOfWeek = this.getDayOfWeek(date);

        const schedule = await this.scheduleRepo.findOne({
            where: { professionalId, dayOfWeek, isActive: true },
            relations: ['breaks'],
        });

        if (!schedule) return { date, slots: [] };

        // Determine dynamic duration
        let duration = serviceDuration; 
        let bufferTime = 15; // Default: 15 mins

        const professional = await this.professionalsService.findOne(professionalId);
        if (professional) {
            bufferTime = professional.bufferTime !== undefined ? Number(professional.bufferTime) : 15;
        }

        if (serviceId) {
            try {
                const proService = await this.servicesService.findOne(serviceId);
                if (proService && proService.duration) {
                    duration = Number(proService.duration);
                }
            } catch (e) {
                // Ignore if service not found, use provided duration
            }
        }

        // The slot step is duration + buffer
        const totalDuration = duration + bufferTime;

        // Get existing bookings for this date
        const existingBookings = await this.bookingRepo.find({
            where: [
                { professionalId, date, status: BookingStatus.CONFIRMED },
                { professionalId, date, status: BookingStatus.PENDING },
            ],
        });

        // Get exceptions for this date
        const exceptions = await this.exceptionRepo.find({
            where: { professionalId, date },
        });

        const isFullDayOff = exceptions.some(e => e.isFullDay);
        if (isFullDayOff) {
            console.log(`[Schedule] Full day off for date ${date}`);
            return { date, slots: [] };
        }

        // 1. NEW: Check Maximum Daily Appointments
        const maxAppts = professional.maxAppointments !== undefined ? Number(professional.maxAppointments) : 8;
        if (existingBookings.length >= maxAppts) {
            console.log(`[Schedule] Max appts reached (${existingBookings.length}/${maxAppts}) for ${date}`);
            return { date, slots: [] };
        }

        console.log(`[Schedule] Generating slots for ${date}. Working Hours: ${schedule.startTime}-${schedule.endTime}`);

        // 2. NEW: Check Advance Notice (if date is today)
        let minTimeInMinutes = -1;
        const todayStr = new Date().toISOString().split('T')[0];
        if (date === todayStr) {
            const now = new Date();
            // Use server time or professional's timezone if applicable. For now, server local.
            const advanceNoticeHours = professional.advanceNotice !== undefined ? Number(professional.advanceNotice) : 2;
            const minTime = new Date(now.getTime() + advanceNoticeHours * 60 * 60 * 1000);
            
            // If the calculated minTime is already on a different day, no slots available today
            if (minTime.toISOString().split('T')[0] !== todayStr) {
                return { date, slots: [] };
            }
            
            minTimeInMinutes = minTime.getHours() * 60 + minTime.getMinutes();
        }

        // Generate time slots
        const slots = this.generateTimeSlots(
            schedule.startTime,
            schedule.endTime,
            schedule.breaks || [],
            existingBookings,
            exceptions,
            totalDuration,
            minTimeInMinutes,
            bufferTime,
        );

        return { date, slots };
    }

    async addException(professionalId: number, data: Partial<ScheduleException>) {
        const exception = this.exceptionRepo.create({
            professionalId,
            ...data
        });
        return this.exceptionRepo.save(exception);
    }

    async getExceptions(professionalId: number) {
        return this.exceptionRepo.find({ where: { professionalId } });
    }

    async removeException(id: number) {
        return this.exceptionRepo.delete(id);
    }

    private generateTimeSlots(
        startTime: string,
        endTime: string,
        breaks: ScheduleBreak[],
        bookings: Booking[],
        exceptions: ScheduleException[],
        serviceDuration: number = 60,
        minTimeInMinutes: number = -1,
        bufferTime: number = 0,
    ): string[] {
        const slots: string[] = [];
        const step = 30; // 30-minute granularity for more flexible slot options
        let current = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);

        while (current + serviceDuration <= end) {
            // NEW: Skip slots before advance notice minimum time
            if (minTimeInMinutes !== -1 && current < minTimeInMinutes) {
                current += step;
                continue;
            }
            
            const slotEnd = current + serviceDuration;
            const timeStr = this.minutesToTime(current);

            // Check if ANY minute of the block falls into a break
            const isBreak = breaks.some(
                (b) =>
                    current < this.timeToMinutes(b.endTime) &&
                    slotEnd > this.timeToMinutes(b.startTime),
            );

            // Check if ANY minute of the block overlaps with an existing booking
            // ADDED: We extend the booking's end time by the bufferTime to guarantee the break
            const isBooked = bookings.some(
                (b) =>
                    current < (this.timeToMinutes(b.endTime) + bufferTime) &&
                    slotEnd > this.timeToMinutes(b.startTime),
            );

            // Check exceptions
            const isExcepted = exceptions.some(
                (e) => 
                    !e.isFullDay && e.startTime && e.endTime &&
                    current < this.timeToMinutes(e.endTime) &&
                    slotEnd > this.timeToMinutes(e.startTime)
            );

            if (!isBreak && !isBooked && !isExcepted) {
                slots.push(this.formatTimeDisplay(timeStr));
            }

            // Advance by the granularity step
            current += step;
        }

        return slots;
    }

    private getDayOfWeek(dateStr: string): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const date = new Date(dateStr + 'T12:00:00');
        return days[date.getDay()];
    }

    private timeToMinutes(time: string): number {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + (m || 0);
    }

    private minutesToTime(minutes: number): string {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    private formatTimeDisplay(time: string): string {
        const [h, m] = time.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    }
}
