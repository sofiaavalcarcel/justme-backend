import type { BusinessMetrics } from '../../../admin/dto/ai.dto';

export const generateInsightsPrompt = (m: BusinessMetrics): string => {
  return `Genera 2 insights de negocio muy cortos basados en:
Ingresos: ${m.totalRevenue} COP
Citas: ${m.totalBookings}
Cancelaciones: ${m.cancelledBookings}
Usuarios Activos: ${m.activeUsers}

Formato JSON estricto:
[{"type": "success|warning|info|danger", "message": "tu texto aquí", "metric": "dato"}]

REGLA CRÍTICA: NO incluyas NINGÚN comentario como // dentro del JSON. Devuelve código JSON puro y válido.`;
};

export const generateChatPrompt = (intent: string, m: BusinessMetrics, userMsg: string): string => {
  return `Contexto de negocio:
Ingresos: ${m.totalRevenue}
Citas: ${m.totalBookings} (Canceladas: ${m.cancelledBookings})
Usuarios: ${m.activeUsers}
Top Servicio: ${m.topService}


Pregunta admin: "${userMsg}"
Responde en 1 o 2 oraciones breves.`;
};
