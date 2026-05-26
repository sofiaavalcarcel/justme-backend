import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dtos/create-module.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Modules } from 'src/auth/decorators/modules.decorator';
import { JwtAuthGuard } from 'src/auth/guards/auth.guard';
import { ModulesGuard } from 'src/auth/guards/modules.guard.guard';

@ApiBearerAuth()
@Modules('modules')
@UseGuards(JwtAuthGuard, ModulesGuard)
@ApiTags('Módulos')
@Controller('modules')
export class ModulesController {

  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo módulo' })
  create(@Body() dto: CreateModuleDto) {
    return this.modulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los módulos' })
  findAll() {
    return this.modulesService.findAll();
  }

}