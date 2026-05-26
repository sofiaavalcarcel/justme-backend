import type { BusinessMetrics } from '../../../admin/dto/ai.dto';

/** Minimal token-optimized prompt for the admin chat. */
export function buildChatPrompt(intent: string, metrics: BusinessMetrics, userMessage: string): string {
  return `Eres el asistente administrativo de JustMe (belleza a domicilio). Responde en 1-3 líneas máximo, en español. Tono profesional y directo.

Intención detectada: ${intent}
KPIs relevantes: reservas=${metrics.totalBookings}, cancelaciones=${metrics.cancelRate}%, ingresos=${Math.round(metrics.totalRevenue)}COP, usuarios=${metrics.totalUsers}, servicio_top="${metrics.topService}", profesionales_inactivos=${metrics.inactiveProCount}

Pregunta del admin: "${userMessage}"`;
}
