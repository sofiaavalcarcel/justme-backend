import { Controller, Get, Patch, Put, Param, ParseIntPipe, Query, UseGuards, Body, DefaultValuePipe, ParseIntPipe as PIP } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from '../services/admin.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('stats')
    @ApiOperation({ summary: 'Obtener estadísticas del dashboard' })
    getStats() {
        return this.adminService.getDashboardStats();
    }

    @Get('users')
    @ApiOperation({ summary: 'Obtener listado paginado de usuarios' })
    getUsers(@Query() pagination: PaginationDto) {
        return this.adminService.getUsers(pagination.page, pagination.limit, pagination.search);
    }

    @Get('professionals')
    @ApiOperation({ summary: 'Obtener listado paginado de profesionales' })
    getProfessionals(@Query() pagination: PaginationDto) {
        return this.adminService.getProfessionals(pagination.page, pagination.limit, pagination.search);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Obtener listado paginado de transacciones' })
    getTransactions(@Query() pagination: PaginationDto) {
        return this.adminService.getTransactions(pagination.page, pagination.limit);
    }

    @Patch('users/:id/status')
    @ApiOperation({ summary: 'Alternar estado activo del usuario' })
    toggleUserStatus(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.toggleUserStatus(id);
    }

    @Put('users/:id')
    @ApiOperation({ summary: 'Actualizar datos de usuario' })
    updateUser(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
        return this.adminService.updateUser(id, data);
    }

    @Patch('professionals/:id/verify')
    @ApiOperation({ summary: 'Verificar a un profesional' })
    verifyProfessional(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.verifyProfessional(id);
    }

    @Get('bookings')
    @ApiOperation({ summary: 'Obtener listado paginado de reservas/citas' })
    getBookings(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.adminService.getBookings(page ? Number(page) : 1, limit ? Number(limit) : 10, { status, search });
    }

    @Patch('bookings/:id/status')
    @ApiOperation({ summary: 'Actualizar el estado de una cita de forma administrativa' })
    updateBookingStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: string,
    ) {
        return this.adminService.updateBookingStatus(id, status);
    }

    @Get('services')
    @ApiOperation({ summary: 'Obtener todas las categorías de servicios (incluyendo inactivas)' })
    getServices() {
        return this.adminService.getServices();
    }

    @Patch('services/:id')
    @ApiOperation({ summary: 'Actualizar categoría de servicio (Nombre/Estado/etc)' })
    updateService(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
        return this.adminService.updateService(id, data);
    }

    @Get('activity')
    @ApiOperation({ summary: 'Obtener actividad reciente de la plataforma' })
    getRecentActivity(
        @Query() pagination: PaginationDto,
        @Query('type') type?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.adminService.getRecentActivity(pagination.page, pagination.limit, { type, startDate, endDate });
    }

    @Get('revenue-chart')
    @ApiOperation({ summary: 'Obtener datos de ingresos mensuales para la gráfica' })
    getRevenueChart() {
        return this.adminService.getMonthlyRevenue();
    }

    @Get('analytics')
    @ApiOperation({ summary: 'Obtener métricas de analítica de la plataforma' })
    getAnalytics() {
        return this.adminService.getAnalytics();
    }

    @Put('professionals/:id')
    @ApiOperation({ summary: 'Actualizar perfil del profesional (Verificación/Visibilidad)' })
    updateProfessional(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
        return this.adminService.updateProfessional(id, data);
    }

    @Get('bookings')
    @ApiOperation({ summary: 'Listar citas paginadas con filtros' })
    getBookings(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.adminService.getBookings(page, limit, { status, search });
    }

    @Patch('bookings/:id/status')
    @ApiOperation({ summary: 'Actualizar estado de una cita' })
    updateBookingStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: string,
    ) {
        return this.adminService.updateBookingStatus(id, status);
    }
}
