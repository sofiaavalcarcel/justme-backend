import {
    Controller, Get, Post, Patch, Delete, Body, Param,
    ParseIntPipe, Query, UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfessionalsService } from '../services/professionals.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { CreateProfessionalDto, UpdateProfessionalDto, NearbySearchDto, ServiceMatchDto } from '../dtos/professional.dto';
import { SearchProfessionalsDto } from '../dtos/search-professionals.dto';

@ApiTags('Profesionales')
@Controller('professionals')
export class ProfessionalsController {
    constructor(
        private readonly professionalsService: ProfessionalsService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    @Get('nearby')
    @ApiOperation({ summary: 'Encontrar profesionales cerca de una ubicación' })
    findNearby(@Query() query: NearbySearchDto) {
        return this.professionalsService.findNearby(query);
    }

    @Get('search')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('USER', 'ADMIN') // Roles allowed
    @ApiOperation({ summary: 'Búsqueda avanzada de profesionales usando PostGIS' })
    searchByLocation(@Query() searchDto: SearchProfessionalsDto) {
        return this.professionalsService.searchByLocation(searchDto);
    }

    @Get('search/match')
    @ApiOperation({ summary: 'Emparejar profesionales basados en un servicio y su radio de atención' })
    matchByService(@Query() query: ServiceMatchDto) {
        return this.professionalsService.matchByService(query);
    }

    @Get('top')
    @ApiOperation({ summary: 'Top profesionales ordenados por calificación y reseñas' })
    findTopRated(
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return this.professionalsService.findTopRated(
            limit ? Number(limit) : 10,
            offset ? Number(offset) : 0,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener perfil de profesional por ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.professionalsService.findOne(id);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Obtener perfil de profesional por ID de usuario' })
    findByUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.professionalsService.findByUserId(userId);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Crear perfil de profesional' })
    create(@CurrentUser('id') userId: number, @Body() dto: CreateProfessionalDto) {
        return this.professionalsService.create(userId, dto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Actualizar perfil de profesional' })
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProfessionalDto) {
        return this.professionalsService.update(id, dto);
    }

    @Post(':id/portfolio')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(FileInterceptor('image'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Subir imagen al portafolio' })
    async uploadPortfolioImage(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
        @Body('caption') caption?: string,
    ) {
        const imageUrl = await this.cloudinaryService.uploadImage(file, 'justme_portfolio');
        return this.professionalsService.addPortfolioImage(id, imageUrl, caption);
    }

    @Delete('portfolio/:imageId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Eliminar imagen del portafolio' })
    removePortfolioImage(@Param('imageId', ParseIntPipe) imageId: number) {
        return this.professionalsService.removePortfolioImage(imageId);
    }
}
