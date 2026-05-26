import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ProfessionalStatsService } from '../services/professional-stats.service';

@ApiTags('Profesionales')
@Controller('professionals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfessionalStatsController {
    constructor(private readonly statsService: ProfessionalStatsService) {}

    @Get(':id/stats')
    @ApiOperation({ summary: 'Obtener estadísticas del dashboard del profesional' })
    getStats(@Param('id', ParseIntPipe) id: number) {
        return this.statsService.getStats(id);
    }
}
