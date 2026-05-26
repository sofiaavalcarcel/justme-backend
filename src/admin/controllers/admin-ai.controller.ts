import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAiService } from '../services/admin-ai.service';
import { AiChatMessageDto } from '../dto/ai.dto';

@ApiTags('Admin IA')
@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminAiController {
  constructor(private readonly aiService: AdminAiService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'KPIs del negocio — calculados en TypeScript, 0 tokens' })
  getMetrics() {
    return this.aiService.getMetrics();
  }

  @Get('insights')
  @ApiOperation({ summary: 'Hasta 3 insights — OpenAI si disponible, fallback local si no' })
  async getInsights() {
    const { insights, source } = await this.aiService.getInsights();
    return { insights, source };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Alertas automáticas generadas por TypeScript — sin IA' })
  getAlerts() {
    return this.aiService.getAlerts();
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat por intención — IA formatea, backend calcula' })
  chat(@Body() body: AiChatMessageDto) {
    return this.aiService.chat(body.message);
  }
}
