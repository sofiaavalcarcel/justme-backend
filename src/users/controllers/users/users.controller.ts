import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { Modules } from '../../../auth/decorators/modules.decorator';
import { ModulesGuard } from '../../../auth/guards/modules.guard.guard';
import { OwnershipGuard } from '../../../common/guards/ownership.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CreateUserDto, UpdateUserDto } from 'src/users/dtos/user.dto';
import { UsersService } from '../../../users/services/users/users.service';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {

    constructor(private usersService: UsersService){}

    @Get()
    @Modules('users')
    @UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
    @Roles('admin') // Solo un admin debería poder listar TODOS los usuarios
    @ApiOperation({ summary: 'Obtener todos los usuarios (Solo Admin)' })
    getUsers() {
        return this.usersService.findAll();
    }

    @Get(':userId')
    @UseGuards(JwtAuthGuard, OwnershipGuard)
    @ApiOperation({ summary: 'Obtener perfil de un usuario específico' })
    @ApiResponse({ status: 403, description: 'No tienes permiso para ver esta cuenta' })
    getOne(@Param('userId', ParseIntPipe) userId: number){
        return this.usersService.findOne(userId);
    }

    @Post()
    @Modules('users')
    @UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
    @Roles('admin') // Asumimos que la creación libre por API la hace un admin (el público usa /auth/register)
    @ApiOperation({ summary: 'Crear un nuevo usuario manualmente (Solo Admin)' })
    createUser(@Body() payload: CreateUserDto){
        return this.usersService.create(payload);
    }

    @Put(':userId')
    @UseGuards(JwtAuthGuard, OwnershipGuard)
    @ApiOperation({ summary: 'Actualizar datos de un usuario' })
    @ApiResponse({ status: 403, description: 'No tienes permiso para modificar esta cuenta' })
    updateUser(@Param('userId', ParseIntPipe) userId: number, @Body() payloadUpdated: UpdateUserDto){
        return this.usersService.updateUser(userId, payloadUpdated);
    }

    @Post(':userId/avatar')
    @UseGuards(JwtAuthGuard, OwnershipGuard)
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Subir avatar de usuario' })
    async uploadAvatar(
        @Param('userId', ParseIntPipe) userId: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const imageUrl = `/uploads/avatars/${file?.filename || 'default-avatar.jpg'}`;
        return this.usersService.updateAvatar(userId, imageUrl);
    }

    @Delete(':userId')
    @UseGuards(JwtAuthGuard, OwnershipGuard)
    @ApiOperation({ summary: 'Eliminar una cuenta de usuario' })
    @ApiResponse({ status: 403, description: 'No tienes permiso para eliminar esta cuenta' })
    deleteUser(@Param('userId', ParseIntPipe) userId: number){
        this.usersService.deleteUser(userId);
    }

}
