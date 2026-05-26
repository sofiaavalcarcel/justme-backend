import { Controller, Get, Post, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FavoritesService } from '../services/favorites.service';

@ApiTags('Favoritos')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
    constructor(private readonly favoritesService: FavoritesService) {}

    @Post(':professionalId')
    @ApiOperation({ summary: 'Añadir/Quitar profesional de favoritos' })
    toggle(
        @CurrentUser('id') userId: number,
        @Param('professionalId', ParseIntPipe) professionalId: number,
    ) {
        return this.favoritesService.toggle(userId, professionalId);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener los favoritos del usuario actual' })
    findUserFavorites(@CurrentUser('id') userId: number) {
        return this.favoritesService.findUserFavorites(userId);
    }

    @Get('check/:professionalId')
    @ApiOperation({ summary: 'Verificar si un profesional está en favoritos' })
    isFavorite(
        @CurrentUser('id') userId: number,
        @Param('professionalId', ParseIntPipe) professionalId: number,
    ) {
        return this.favoritesService.isFavorite(userId, professionalId);
    }
}
