import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Professional } from '../entities/professional.entity';
import { PortfolioImage } from '../entities/portfolio-image.entity';
import { User } from '../../users/entities/user.entity';
import { CreateProfessionalDto, UpdateProfessionalDto, NearbySearchDto, ServiceMatchDto } from '../dtos/professional.dto';
import { SearchProfessionalsDto } from '../dtos/search-professionals.dto';
import { ScheduleService } from '../../schedule/services/schedule.service';

@Injectable()
export class ProfessionalsService {
    constructor(
        @InjectRepository(Professional) private proRepo: Repository<Professional>,
        @InjectRepository(PortfolioImage) private portfolioRepo: Repository<PortfolioImage>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @Inject(forwardRef(() => ScheduleService))
        private scheduleService: ScheduleService,
    ) {}

    async findNearby(dto: NearbySearchDto) {
        const radius = dto.radius || 5; // km

        let query = this.proRepo
            .createQueryBuilder('professional')
            .leftJoinAndSelect('professional.user', 'user')
            .leftJoinAndSelect('professional.schedules', 'schedules')
            .leftJoinAndSelect('professional.professionalServices', 'ps', 'ps.isActive = true')
            .leftJoinAndSelect('ps.service', 'service')
            .where('professional.isVisible = :visible', { visible: true })
            .andWhere('professional.latitude IS NOT NULL')
            .andWhere('professional.longitude IS NOT NULL')
            // ── Haversine SQL approximation (PostGIS fallback) ──
            .andWhere(
                `(6371 * acos(least(1.0, cos(radians(CAST(:lat AS float))) * cos(radians(CAST(professional.latitude AS float))) * cos(radians(CAST(professional.longitude AS float)) - radians(CAST(:lng AS float))) + sin(radians(CAST(:lat AS float))) * sin(radians(CAST(professional.latitude AS float)))))) <= :radius`,
                { lat: dto.latitude, lng: dto.longitude, radius },
            );

        if (dto.service) {
            // Filtra por nombre o categoría global — sin usar ps.name (ya no existe)
            query = query.andWhere(
                '(service.name ILIKE :serviceName OR service.category ILIKE :serviceName)',
                { serviceName: `%${dto.service}%` }
            );
        }

        if (dto.date && dto.time) {
            const dayOfWeek = this.getDayOfWeek(dto.date);
            const duration = 60; // Default duration of 60 minutes if no specific service selected or for general check

            // 1. Basic Working Hours Filter
            query = query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('schedules', 's')
                    .where('s.professionalId = professional.id')
                    .andWhere('s.dayOfWeek = :dayOfWeek', { dayOfWeek })
                    .andWhere('s.isActive = :isActive', { isActive: true })
                    .andWhere('s.startTime <= :time', { time: dto.time })
                    .andWhere('s.endTime >= CAST(CAST(:time AS TIME) + CAST((:duration || \' minutes\') AS INTERVAL) AS TIME)', { time: dto.time, duration })
                    .getQuery();
                return 'EXISTS ' + subQuery;
            });

            // 2. Booking Filter
            query = query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('bookings', 'b')
                    .where('b.professionalId = professional.id')
                    .andWhere('b.date = :date', { date: dto.date })
                    .andWhere('b.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
                    .andWhere('b.startTime < CAST(CAST(:time AS TIME) + CAST((:duration || \' minutes\') AS INTERVAL) AS TIME)', { time: dto.time, duration })
                    .andWhere('b.endTime > CAST(:time AS TIME)', { time: dto.time })
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            });

            // 3. Breaks Filter
            query = query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('schedule_breaks', 'sb')
                    .leftJoin('schedules', 's', 'sb.scheduleId = s.id')
                    .where('s.professionalId = professional.id')
                    .andWhere('s.dayOfWeek = :dayOfWeek', { dayOfWeek })
                    .andWhere('sb.startTime < CAST(CAST(:time AS TIME) + CAST((:duration || \' minutes\') AS INTERVAL) AS TIME)', { time: dto.time, duration })
                    .andWhere('sb.endTime > CAST(:time AS TIME)', { time: dto.time })
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            });

            // 4. Exceptions Filter
            query = query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('schedule_exceptions', 'se')
                    .where('se.professionalId = professional.id')
                    .andWhere('se.date = :date', { date: dto.date })
                    .andWhere(
                        '(se.isFullDay = true OR (se.startTime < CAST(CAST(:time AS TIME) + CAST((:duration || \' minutes\') AS INTERVAL) AS TIME) AND se.endTime > CAST(:time AS TIME)))',
                        { time: dto.time, duration }
                    )
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            });
        }

        // ── Add distance as a calculated column ──
        query.addSelect(
            `(6371 * acos(least(1.0, cos(radians(CAST(:lat AS float))) * cos(radians(CAST(professional.latitude AS float))) * cos(radians(CAST(professional.longitude AS float)) - radians(CAST(:lng AS float))) + sin(radians(CAST(:lat AS float))) * sin(radians(CAST(professional.latitude AS float))))))`,
            'distance_km',
        );

        // ── Sort: best rating first, then closest ──
        query
            .orderBy('professional.averageRating', 'DESC')
            .addOrderBy('distance_km', 'ASC');

        const { entities, raw } = await query.getRawAndEntities();

        // DISTINCT manual: eliminar duplicados por id de profesional
        // (puede haber filas duplicadas si el profesional tiene varias categorías activas)
        const seen = new Set<number>();
        const unique: typeof entities = [];
        const uniqueRaw: typeof raw = [];
        entities.forEach((pro, i) => {
            if (!seen.has(pro.id)) {
                seen.add(pro.id);
                unique.push(pro);
                uniqueRaw.push(raw[i]);
            }
        });

        return unique.map((pro, i) => ({
            ...pro,
            distance: parseFloat(parseFloat(uniqueRaw[i]?.distance_km || '0').toFixed(1)),
        }));
    }

    async matchByService(dto: ServiceMatchDto) {
        const { serviceId, latitude, longitude, date, time } = dto;

        let query = this.proRepo
            .createQueryBuilder('professional')
            .leftJoinAndSelect('professional.user', 'user')
            .leftJoinAndSelect('professional.professionalServices', 'ps')
            .leftJoinAndSelect('ps.service', 'service')
            .leftJoinAndSelect('professional.portfolioImages', 'portfolio')
            .leftJoin('professional.schedules', 'schedules')
            .where('professional.isVisible = :visible', { visible: true })
            .andWhere('ps.serviceId = :serviceId', { serviceId })
            .andWhere('ps.isActive = :active', { active: true })
            .andWhere(
                '(6371 * acos(least(1.0, cos(radians(CAST(:lat AS float))) * cos(radians(CAST(professional.latitude AS float))) * cos(radians(CAST(professional.longitude AS float)) - radians(CAST(:lng AS float))) + sin(radians(CAST(:lat AS float))) * sin(radians(CAST(professional.latitude AS float)))))) <= professional.serviceRadius',
                { lat: latitude, lng: longitude }
            );

        if (date && time) {
            const dayOfWeek = this.getDayOfWeek(date);
            
            // 1. Basic Working Hours Filter
            query = query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('schedules', 's')
                    .where('s.professionalId = professional.id')
                    .andWhere('s.dayOfWeek = :dayOfWeek', { dayOfWeek })
                    .andWhere('s.isActive = :isActive', { isActive: true })
                    .andWhere('s.startTime <= :time', { time })
                    // We also check that endTime >= time + duration
                    // Duration is in ps.duration
                    .andWhere('s.endTime >= CAST(CAST(:time AS TIME) + CAST((ps.duration || \' minutes\') AS INTERVAL) AS TIME)')
                    .getQuery();
                return 'EXISTS ' + subQuery;
            });

            // 2. Booking Filter (No confirmed/pending bookings at that time)
            query = query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('bookings', 'b')
                    .where('b.professionalId = professional.id')
                    .andWhere('b.date = :date', { date })
                    .andWhere('b.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
                    .andWhere('b.startTime < CAST(CAST(:time AS TIME) + CAST((ps.duration || \' minutes\') AS INTERVAL) AS TIME)')
                    .andWhere('b.endTime > CAST(:time AS TIME)')
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            });

            // 3. Breaks Filter
            query = query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('schedule_breaks', 'sb')
                    .leftJoin('schedules', 's', 'sb.scheduleId = s.id')
                    .where('s.professionalId = professional.id')
                    .andWhere('s.dayOfWeek = :dayOfWeek', { dayOfWeek })
                    .andWhere('sb.startTime < CAST(CAST(:time AS TIME) + CAST((ps.duration || \' minutes\') AS INTERVAL) AS TIME)')
                    .andWhere('sb.endTime > CAST(:time AS TIME)')
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            });

            // 4. Exceptions Filter
            query = query.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('schedule_exceptions', 'se')
                    .where('se.professionalId = professional.id')
                    .andWhere('se.date = :date', { date })
                    .andWhere(
                        '(se.isFullDay = true OR (se.startTime < CAST(CAST(:time AS TIME) + CAST((ps.duration || \' minutes\') AS INTERVAL) AS TIME) AND se.endTime > CAST(:time AS TIME)))'
                    )
                    .getQuery();
                return 'NOT EXISTS ' + subQuery;
            });
        }

        return query
            .orderBy('professional.averageRating', 'DESC')
            .addOrderBy('professional.completedServices', 'DESC')
            .getMany();
    }

    private getDayOfWeek(dateStr: string): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const date = new Date(dateStr + 'T12:00:00');
        return days[date.getDay()];
    }

    async isLocationInRadius(proId: number, lat: number, lng: number): Promise<{ inRadius: boolean; distance: number }> {
        const pro = await this.proRepo.findOne({ where: { id: proId } });
        if (!pro) return { inRadius: false, distance: 0 };
        if (pro.latitude === null || pro.longitude === null) {
            return { inRadius: true, distance: 0 }; 
        }

        // Use a more robust raw query for the distance calculation
        const result = await this.proRepo.query(
            `SELECT (6371 * acos(least(1.0, cos(radians(CAST($2 AS float))) * cos(radians(CAST(latitude AS float))) * cos(radians(CAST(longitude AS float)) - radians(CAST($1 AS float))) + sin(radians(CAST($2 AS float))) * sin(radians(CAST(latitude AS float)))))) AS distance 
             FROM professionals WHERE id = $3`,
            [lng, lat, proId]
        );

        if (!result || result.length === 0) return { inRadius: false, distance: 0 };
        
        const distance = parseFloat(result[0].distance);
        return {
            inRadius: distance <= pro.serviceRadius,
            distance
        };
    }

    async searchByLocation(dto: SearchProfessionalsDto) {
        const { latitude, longitude, radiusKm, sector, limit = 10, offset = 0 } = dto;
        const radiusMeters = radiusKm * 1000;

        const queryBuilder = this.proRepo.createQueryBuilder('pro')
            .leftJoinAndSelect('pro.user', 'user')
            .leftJoinAndSelect('pro.professionalServices', 'ps', 'ps.isActive = true')
            .leftJoinAndSelect('ps.service', 'service')
            .where('pro.isVisible = :visible', { visible: true });

        if (sector) {
            // Filtra por categoría global (service.name o service.category)
            queryBuilder.andWhere(
                '(service.name ILIKE :sector OR service.category ILIKE :sector)',
                { sector: `%${sector}%` }
            );
        }

        queryBuilder.andWhere(
            `(6371 * acos(least(1.0, cos(radians(CAST(:latitude AS float))) * cos(radians(CAST(pro.latitude AS float))) * cos(radians(CAST(pro.longitude AS float)) - radians(CAST(:longitude AS float))) + sin(radians(CAST(:latitude AS float))) * sin(radians(CAST(pro.latitude AS float)))))) * 1000 <= :radiusMeters`,
            { longitude, latitude, radiusMeters }
        );

        queryBuilder.addSelect(
            `(6371 * acos(least(1.0, cos(radians(CAST(:latitude AS float))) * cos(radians(CAST(pro.latitude AS float))) * cos(radians(CAST(pro.longitude AS float)) - radians(CAST(:longitude AS float))) + sin(radians(CAST(:latitude AS float))) * sin(radians(CAST(pro.latitude AS float))))))`,
            'distance_km'
        );

        queryBuilder.orderBy('distance_km', 'ASC');
        queryBuilder.take(limit).skip(offset);

        const { entities, raw } = await queryBuilder.getRawAndEntities();

        const data = entities.map((pro, index) => ({
            ...pro,
            distanceKm: parseFloat(raw[index].distance_km).toFixed(2),
        }));

        const total = await queryBuilder.getCount();

        return { data, total, limit, offset };
    }

    /**
     * Returns all visible professionals sorted by rating (DESC) then reviewCount (DESC).
     * Used by the home screen "Top Professionals" and the "All Professionals" screen.
     */
    async findTopRated(limit = 10, offset = 0) {
        const queryBuilder = this.proRepo
            .createQueryBuilder('professional')
            .leftJoinAndSelect('professional.user', 'user')
            .leftJoinAndSelect('professional.professionalServices', 'ps', 'ps.isActive = true')
            .leftJoinAndSelect('ps.service', 'service')
            .where('professional.isVisible = :visible', { visible: true })
            .orderBy('professional.averageRating', 'DESC')
            .addOrderBy('professional.reviewCount', 'DESC')
            .take(limit)
            .skip(offset);

        const [data, total] = await queryBuilder.getManyAndCount();

        return { data, total, limit, offset };
    }

    async findOne(id: number) {
        const professional = await this.proRepo.findOne({
            where: { id },
            relations: [
                'user',
                'professionalServices',
                'professionalServices.service',
                'portfolioImages',
                'schedules',
                'schedules.breaks',
                'reviews',
                'reviews.user',
            ],
        });
        if (!professional) {
            throw new NotFoundException(`Professional #${id} not found`);
        }
        if (professional.professionalServices) {
            professional.professionalServices = professional.professionalServices.filter(ps => ps.isActive);
        }
        return professional;
    }

    async findByUserId(userId: number) {
        const professional = await this.proRepo.findOne({
            where: { userId },
            relations: ['professionalServices', 'professionalServices.service', 'portfolioImages'],
        });
        if (professional && professional.professionalServices) {
            professional.professionalServices = professional.professionalServices.filter(ps => ps.isActive);
        }
        return professional;
    }

    async create(userId: number, dto: CreateProfessionalDto) {
        const professional = this.proRepo.create({
            userId,
            ...dto,
        });
        return this.proRepo.save(professional);
    }

    async update(id: number, dto: UpdateProfessionalDto) {
        const professional = await this.findOne(id);
        
        // 1. Separate fields
        const { name, lastName, email, phone, schedule, ...proData } = dto;

        // 2. Update user related fields if any are provided
        if (name !== undefined || lastName !== undefined || email !== undefined || phone !== undefined) {
            const userUpdate: any = {};
            if (name !== undefined) userUpdate.name = name;
            if (lastName !== undefined) userUpdate.lastName = lastName;
            if (email !== undefined) userUpdate.email = email;
            if (phone !== undefined) userUpdate.phone = phone;
            
            await this.userRepo.update(professional.userId, userUpdate);
        }

        // 3. Handle nested schedule update if it comes from the frontend dashboard
        if (schedule) {
            const transformedSchedule = this.transformFrontendSchedule(schedule);
            await this.scheduleService.setSchedule(id, transformedSchedule);
            
            // Explicitly capture preferences from the nested schedule object
            if (schedule.maxAppointments !== undefined) professional.maxAppointments = schedule.maxAppointments;
            if (schedule.bufferTime !== undefined) professional.bufferTime = schedule.bufferTime;
            if (schedule.advanceNotice !== undefined) professional.advanceNotice = schedule.advanceNotice;
        }

        // 4. Update professional entity with remaining fields
        Object.keys(proData).forEach(key => {
            if (proData[key] === undefined) {
                delete proData[key];
            }
        });
        
        Object.assign(professional, proData);

        // Remove relations from memory to prevent TypeORM cascading updates on deleted entities
        const proAny = professional as any;
        delete proAny.schedules;
        delete proAny.user;
        delete proAny.professionalServices;
        delete proAny.portfolioImages;
        delete proAny.reviews;

        await this.proRepo.save(professional);

        return this.findOne(id);
    }

    private transformFrontendSchedule(feSchedule: any): any[] {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const transformed: any[] = [];

        days.forEach(day => {
            const isActive = feSchedule.activeDays?.[day] ?? false;
            const times = feSchedule.dayTimes?.[day] || { start: '09:00', end: '18:00' };
            
            transformed.push({
                dayOfWeek: day,
                startTime: times.start,
                endTime: times.end,
                isActive: isActive,
                breaks: feSchedule.breaks?.map((b: any) => ({
                    title: b.name || 'Break',
                    startTime: b.start,
                    endTime: b.end
                })) || []
            });
        });

        return transformed;
    }

    async addPortfolioImage(professionalId: number, imageUrl: string, caption?: string) {
        const count = await this.portfolioRepo.count({ where: { professionalId } });
        const image = this.portfolioRepo.create({
            professionalId,
            imageUrl,
            caption,
            order: count,
        });
        return this.portfolioRepo.save(image);
    }

    async removePortfolioImage(imageId: number) {
        return this.portfolioRepo.delete(imageId);
    }

    async updateRating(professionalId: number) {
        const result = await this.proRepo
            .createQueryBuilder('professional')
            .leftJoin('professional.reviews', 'review')
            .select('AVG(review.rating)', 'avg')
            .addSelect('COUNT(review.id)', 'count')
            .where('professional.id = :id', { id: professionalId })
            .getRawOne();

        await this.proRepo.update(professionalId, {
            averageRating: parseFloat(result.avg) || 0,
            reviewCount: parseInt(result.count) || 0,
        });
    }

    async incrementCompletedServices(professionalId: number) {
        await this.proRepo.increment({ id: professionalId }, 'completedServices', 1);
    }

    async setVisibility(professionalId: number, visible: boolean) {
        await this.proRepo.update(professionalId, { isVisible: visible });
    }

    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
