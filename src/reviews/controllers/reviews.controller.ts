import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from '../services/reviews.service';

@ApiTags('Reseñas')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Crear una reseña para un profesional' })
    create(@CurrentUser('id') userId: number, @Body() body: { professionalId: number; bookingId?: number; rating: number; comment?: string }) {
        return this.reviewsService.create(userId, body);
    }

    @Get('professional/:professionalId')
    @ApiOperation({ summary: 'Obtener las reseñas de un profesional' })
    findByProfessional(@Param('professionalId', ParseIntPipe) professionalId: number) {
        return this.reviewsService.findByProfessional(professionalId);
    }

    @Get('user')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener las reseñas escritas por el usuario actual' })
    findByUser(@CurrentUser('id') userId: number) {
        return this.reviewsService.findByUser(userId);
    }
}
