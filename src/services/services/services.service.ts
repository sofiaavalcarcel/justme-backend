import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../entities/service.entity';
import { ProfessionalService } from '../entities/professional-service.entity';
import { CategoryRequest } from '../entities/category-request.entity';
import { CreateServiceDto, UpdateServiceDto } from '../dtos/service.dto';
import { CreateProfessionalServiceDto, UpdateProfessionalServiceDto } from '../dtos/professional-service.dto';
import { CreateCategoryRequestDto } from '../dtos/category-request.dto';

@Injectable()
export class ServicesService {
    constructor(
        @InjectRepository(Service) private serviceRepo: Repository<Service>,
        @InjectRepository(ProfessionalService) private proServiceRepo: Repository<ProfessionalService>,
        @InjectRepository(CategoryRequest) private categoryRequestRepo: Repository<CategoryRequest>,
    ) {}

    // ─── Catálogo de categorías globales (gestionado por admin) ──────────────

    async findAllCategories() {
        try {
            const categories = await this.serviceRepo.find({ where: { isActive: true } });
            if (categories.length === 0) {
                const defaultCat = this.serviceRepo.create({
                    name: 'Belleza y Bienestar',
                    category: 'Belleza',
                    description: 'Categoría general para servicios de belleza',
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

    // ─── Servicios del profesional ────────────────────────────────────────────

    /**
     * Retorna los servicios activos de un profesional con la info de la categoría.
     * El nombre visible es el de la categoría global (service.name).
     */
    async findProfessionalServices(professionalId: number) {
        return this.proServiceRepo.find({
            where: { professionalId, isActive: true },
            relations: ['service'],
            order: { serviceId: 'ASC' },
        });
    }

    /**
     * UPSERT: Si el profesional ya tiene ese serviceId → actualiza precio/duración.
     * Si no existe → crea registro nuevo.
     * Garantiza que nunca haya duplicados de categoría por profesional.
     */
    async addProfessionalService(professionalId: number, dto: CreateProfessionalServiceDto) {
        // 1. Verificar que la categoría existe en el catálogo global
        const categoryExists = await this.serviceRepo.findOne({ where: { id: dto.serviceId } });
        if (!categoryExists) {
            throw new NotFoundException(`Categoría #${dto.serviceId} no encontrada en el catálogo`);
        }

        // 2. Buscar si ya existe un registro para (profesional + categoría)
        const existing = await this.proServiceRepo.findOne({
            where: { professionalId, serviceId: dto.serviceId },
        });

        if (existing) {
            // UPDATE: actualizar precio, duración y descripción
            existing.price = dto.price;
            existing.duration = dto.duration;
            if (dto.description !== undefined) existing.description = dto.description;
            existing.isActive = true; // Reactivar si estaba desactivado
            const updated = await this.proServiceRepo.save(existing);
            return this.proServiceRepo.findOne({ where: { id: updated.id }, relations: ['service'] });
        }

        // INSERT: crear nuevo registro
        const newService = this.proServiceRepo.create({
            professionalId,
            serviceId: dto.serviceId,
            price: dto.price,
            duration: dto.duration,
            description: dto.description,
            isActive: true,
        });
        const saved = await this.proServiceRepo.save(newService);
        return this.proServiceRepo.findOne({ where: { id: saved.id }, relations: ['service'] });
    }

    async updateProfessionalService(id: number, dto: UpdateProfessionalServiceDto) {
        const service = await this.proServiceRepo.findOne({ where: { id } });
        if (!service) throw new NotFoundException(`Professional service #${id} not found`);

        if (dto.price !== undefined)       service.price       = dto.price;
        if (dto.duration !== undefined)    service.duration    = dto.duration;
        if (dto.description !== undefined) service.description = dto.description;

        await this.proServiceRepo.save(service);

        // Re-fetch con la relación de categoría para retornar datos frescos
        return this.proServiceRepo.findOne({ where: { id }, relations: ['service'] });
    }

    /**
     * Soft delete: desactiva el servicio del profesional.
     * Si el profesional quiere re-habilitarlo, addProfessionalService lo reactiva.
     */
    async removeProfessionalService(id: number) {
        const service = await this.proServiceRepo.findOne({ where: { id } });
        if (!service) throw new NotFoundException(`Professional service #${id} not found`);
        service.isActive = false;
        return this.proServiceRepo.save(service);
    }

    async findOne(id: number) {
        const service = await this.proServiceRepo.findOne({ where: { id }, relations: ['service'] });
        if (!service) throw new NotFoundException(`Professional service #${id} not found`);
        return service;
    }

    // ─── Solicitudes de nuevas categorías ────────────────────────────────────

    /**
     * Un profesional solicita agregar una nueva categoría al catálogo global.
     * Se valida que no exista ya una solicitud pendiente con el mismo nombre.
     */
    async createCategoryRequest(professionalId: number, dto: CreateCategoryRequestDto): Promise<CategoryRequest> {
        const nameLower = dto.name.toLowerCase().trim();

        // Verificar si ya existe una solicitud pendiente con el mismo nombre del mismo profesional
        const existing = await this.categoryRequestRepo.findOne({
            where: { professionalId, status: 'pending' },
        });
        if (existing) {
            throw new ConflictException(
                `Ya tienes una solicitud pendiente (#${existing.id}). Espera a que sea revisada antes de enviar otra.`,
            );
        }

        // Verificar si la categoría ya existe en el catálogo global
        const existsInCatalog = await this.serviceRepo
            .createQueryBuilder('s')
            .where('LOWER(s.name) = :name', { name: nameLower })
            .andWhere('s.isActive = true')
            .getOne();
        if (existsInCatalog) {
            throw new ConflictException(
                `La categoría "${existsInCatalog.name}" ya existe en el catálogo. Puedes seleccionarla directamente.`,
            );
        }

        const request = this.categoryRequestRepo.create({
            professionalId,
            name: dto.name.trim(),
            category: dto.category.trim(),
            description: dto.description,
            icon: dto.icon,
            status: 'pending',
        });
        return this.categoryRequestRepo.save(request);
    }

    /**
     * Retorna el historial de solicitudes de categoría del profesional.
     */
    async findProfessionalCategoryRequests(professionalId: number): Promise<CategoryRequest[]> {
        return this.categoryRequestRepo.find({
            where: { professionalId },
            order: { createdAt: 'DESC' },
        });
    }
}
