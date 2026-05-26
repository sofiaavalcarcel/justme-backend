import {
    Controller, Get, Put, Body, Param, ParseIntPipe, Query, UseGuards, Post, Delete, ParseArrayPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ScheduleService } from '../services/schedule.service';
import { ScheduleDayDto } from '../dtos/schedule.dto';

@ApiTags('Agenda')
@Controller('schedule')
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) {}

    @Get(':professionalId')
    @ApiOperation({ summary: 'Obtener configuración de agenda del profesional' })
    getSchedule(@Param('professionalId', ParseIntPipe) professionalId: number) {
        return this.scheduleService.getSchedule(professionalId);
    }

    @Put(':professionalId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Configurar o actualizar la agenda del profesional' })
    setSchedule(
        @Param('professionalId', ParseIntPipe) professionalId: number,
        @Body(new ParseArrayPipe({ items: ScheduleDayDto })) scheduleData: ScheduleDayDto[],
    ) {
        return this.scheduleService.setSchedule(professionalId, scheduleData);
    }

    @Get(':professionalId/available-slots')
    @ApiOperation({ summary: 'Obtener los horarios disponibles para una fecha, duración de servicio y ubicación' })
    getAvailableSlots(
        @Param('professionalId', ParseIntPipe) professionalId: number,
        @Query('date') date: string,
        @Query('serviceId') serviceId?: number,
        @Query('serviceDuration') serviceDuration?: number,
        @Query('latitude') latitude?: number,
        @Query('longitude') longitude?: number,
    ) {
        return this.scheduleService.getAvailableSlots(
            professionalId, 
            date, 
            serviceId ? +serviceId : undefined, 
            latitude ? +latitude : undefined, 
            longitude ? +longitude : undefined,
            serviceDuration ? +serviceDuration : 60
        );
    }

    @Get(':professionalId/exceptions')
    @ApiOperation({ summary: 'Obtener excepciones de horario' })
    getExceptions(@Param('professionalId', ParseIntPipe) professionalId: number) {
        return this.scheduleService.getExceptions(professionalId);
    }

    @Post(':professionalId/exceptions')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Agregar excepción de horario' })
    addException(
        @Param('professionalId', ParseIntPipe) professionalId: number,
        @Body() exceptionData: any,
    ) {
        return this.scheduleService.addException(professionalId, exceptionData);
    }

    @Delete('exceptions/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Eliminar excepción de horario' })
    removeException(@Param('id', ParseIntPipe) id: number) {
        return this.scheduleService.removeException(id);
    }
}
