import { Controller, Get, Patch, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('Notificaciones')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    @ApiOperation({ summary: 'Obtener notificaciones del usuario' })
    getNotifications(@CurrentUser('id') userId: number) {
        return this.notificationsService.getUserNotifications(userId);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Obtener cantidad de notificaciones sin leer' })
    getUnreadCount(@CurrentUser('id') userId: number) {
        return this.notificationsService.getUnreadCount(userId);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Marcar notificación como leída' })
    markAsRead(@Param('id', ParseIntPipe) id: number) {
        return this.notificationsService.markAsRead(id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
    markAllAsRead(@CurrentUser('id') userId: number) {
        return this.notificationsService.markAllAsRead(userId);
    }

    @Patch('delete-all')
    @ApiOperation({ summary: 'Eliminar todas las notificaciones del usuario' })
    deleteAll(@CurrentUser('id') userId: number) {
        return this.notificationsService.deleteAll(userId);
    }
}
