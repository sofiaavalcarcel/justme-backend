import {
    Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingsService } from '../services/bookings.service';
import { CreateBookingDto, UpdateBookingStatusDto } from '../dtos/booking.dto';
import { RescheduleBookingDto } from '../dtos/reschedule-booking.dto';
import { BookingStatus } from '../entities/booking.entity';

@ApiTags('Reservas')
@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Crear una nueva reserva' })
    create(@CurrentUser('id') userId: number, @Body() dto: CreateBookingDto) {
        return this.bookingsService.create(userId, dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener reservas del usuario actual' })
    findUserBookings(@CurrentUser('id') userId: number) {
        return this.bookingsService.findUserBookings(userId);
    }

    @Get('professional/:professionalId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener reservas de un profesional' })
    findProfessionalBookings(@Param('professionalId', ParseIntPipe) professionalId: number) {
        return this.bookingsService.findProfessionalBookings(professionalId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener una reserva por su ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.bookingsService.findOne(id);
    }

    @Patch(':id/reschedule')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reprogramar una reserva existente' })
    reschedule(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RescheduleBookingDto,
    ) {
        return this.bookingsService.reschedule(id, dto.date, dto.startTime);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Actualizar el estado de una reserva' })
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBookingStatusDto,
    ) {
        return this.bookingsService.updateStatus(id, dto.status as BookingStatus);
    }
}
