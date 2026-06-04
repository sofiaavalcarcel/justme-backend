import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../entities/service.entity';
import { ProfessionalService } from '../entities/professional-service.entity';
import { CreateServiceDto, UpdateServiceDto } from '../dtos/service.dto';
import { CreateProfessionalServiceDto, UpdateProfessionalServiceDto } from '../dtos/professional-service.dto';

@Injectable()
export class ServicesService {
    constructor(
        @InjectRepository(Service) private serviceRepo: Repository<Service>,
        @InjectRepository(ProfessionalService) private proServiceRepo: Repository<ProfessionalService>,
    ) {}

    // Service categories
    async findAllCategories() {
        try {
            const categories = await this.serviceRepo.find();
            if (categories.length === 0) {
                const defaultCat = this.serviceRepo.create({ 
                    name: 'Belleza y Bienestar', 
                    category: 'Belleza',
                    description: 'Categoría general para servicios de belleza' 
                });
                await this.serviceRepo.save(defaultCat);
                return [defaultCat];
            }
            return categories;
        } catch (error) {
            console.error('Error in findAllCategories:', error);
            throw new Error(`Failed to fetch/seed categories: ${error.message}`);
        }
    }

    async findCategoryById(id: number) {
        const service = await this.serviceRepo.findOne({ where: { id } });
        if (!service) throw new NotFoundException(`Service #${id} not found`);
        return service;
    }

    async createCategory(dto: CreateServiceDto) {
        const service = this.serviceRepo.create(dto);
        return this.serviceRepo.save(service);
    }

    async updateCategory(id: number, dto: UpdateServiceDto) {
        const service = await this.findCategoryById(id);
        this.serviceRepo.merge(service, dto);
        return this.serviceRepo.save(service);
    }

    // Professional services
    async findProfessionalServices(professionalId: number) {
        return this.proServiceRepo.find({
            where: { professionalId, isActive: true },
            relations: ['service'],
        });
    }

    async addProfessionalService(professionalId: number, dto: CreateProfessionalServiceDto) {
        try {
            // Ensure the serviceId exists to avoid Foreign Key errors
            let targetServiceId = dto.serviceId;
            if (targetServiceId) {
                const serviceExists = await this.serviceRepo.findOne({ where: { id: targetServiceId } });
                if (!serviceExists) targetServiceId = undefined;
            }
            if (!targetServiceId) {
                const firstCategory = await this.findAllCategories();
                targetServiceId = firstCategory[0].id;
            }

            const service = this.proServiceRepo.create({
                professionalId,
                name: dto.name,
                description: dto.description,
                price: dto.price ?? 0,
                duration: dto.duration ?? 60,
                serviceId: targetServiceId,
                isActive: true,
            });
            return await this.proServiceRepo.save(service);
        } catch (error) {
            console.error('Error in addProfessionalService:', error);
            throw new Error(`Failed to add service: ${error.message}`);
        }
    }

    async updateProfessionalService(id: number, dto: UpdateProfessionalServiceDto) {
        const service = await this.proServiceRepo.findOne({ where: { id } });
        if (!service) throw new NotFoundException(`Professional service #${id} not found`);

        // Explicitly assign each field so FK columns like serviceId are reliably updated
        if (dto.name !== undefined)        service.name        = dto.name;
        if (dto.description !== undefined) service.description = dto.description;
        if (dto.price !== undefined)       service.price       = dto.price;
        if (dto.duration !== undefined)    service.duration    = dto.duration;
        if (dto.serviceId !== undefined)   service.serviceId   = dto.serviceId;

        await this.proServiceRepo.save(service);

        // Re-fetch with the service (category) relation so the caller always gets fresh data
        return this.proServiceRepo.findOne({ where: { id }, relations: ['service'] });
    }

    async removeProfessionalService(id: number) {
        const service = await this.proServiceRepo.findOne({ where: { id } });
        if (!service) throw new NotFoundException(`Professional service #${id} not found`);
        service.isActive = false;
        return this.proServiceRepo.save(service);
    }

    async findOne(id: number) {
        const service = await this.proServiceRepo.findOne({ where: { id } });
        if (!service) throw new NotFoundException(`Professional service #${id} not found`);
        return service;
    }
}
