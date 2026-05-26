import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../entities/favorite.entity';

@Injectable()
export class FavoritesService {
    constructor(
        @InjectRepository(Favorite) private favRepo: Repository<Favorite>,
    ) {}

    async toggle(userId: number, professionalId: number) {
        const existing = await this.favRepo.findOne({
            where: { userId, professionalId },
        });

        if (existing) {
            await this.favRepo.remove(existing);
            return { isFavorite: false };
        }

        const favorite = this.favRepo.create({ userId, professionalId });
        await this.favRepo.save(favorite);
        return { isFavorite: true };
    }

    async findUserFavorites(userId: number) {
        return this.favRepo.find({
            where: { userId },
            relations: ['professional', 'professional.user', 'professional.professionalServices', 'professional.professionalServices.service'],
            order: { createdAt: 'DESC' },
        });
    }

    async isFavorite(userId: number, professionalId: number): Promise<boolean> {
        const count = await this.favRepo.count({ where: { userId, professionalId } });
        return count > 0;
    }
}
