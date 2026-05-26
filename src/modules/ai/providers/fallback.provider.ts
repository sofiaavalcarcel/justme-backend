import type { BusinessMetrics, AiInsight, AiAlert } from '../../../admin/dto/ai.dto';

/**
 * FallbackProvider
 * ─────────────────
 * 100% TypeScript. No external API. Zero cost.
 * Generates insights, alerts, and chat responses locally.
 */
export class FallbackProvider {

  generateInsights(m: BusinessMetrics): AiInsight[] {
    const insights: AiInsight[] = [];

    if (m.cancelRate >= 30) {
      insights.push({ id: 'cancel-high', type: 'warning', message: `Las cancelaciones están al ${m.cancelRate}%. Revisa la política de reservas.`, metric: `${m.cancelRate}%` });
    } else if (m.bookingRate >= 70) {
      insights.push({ id: 'completion-good', type: 'success', message: `Tasa de completación del ${m.bookingRate}%. El servicio opera en niveles óptimos.`, metric: `${m.bookingRate}%` });
    }

    if (m.topService && m.topService !== 'N/A') {
      insights.push({ id: 'top-service', type: 'info', message: `"${m.topService}" lidera la demanda esta temporada.`, metric: m.topService });
    }

    if (m.inactiveProCount >= 3) {
      insights.push({ id: 'inactive-pros', type: 'warning', message: `${m.inactiveProCount} profesionales sin actividad en 30 días. Considera contactarlos.`, metric: m.inactiveProCount });
    } else if (m.recentGrowth > 0) {
      insights.push({ id: 'growth', type: 'success', message: `Registros de usuarios crecieron +${m.recentGrowth}% respecto al mes anterior.`, metric: `+${m.recentGrowth}%` });
    }

    return insights.slice(0, 3);
  }

  generateAlerts(m: BusinessMetrics): AiAlert[] {
    const alerts: AiAlert[] = [];

    if (m.inactiveProCount >= 3) {
      alerts.push({ id: 'inactive-pros', severity: m.inactiveProCount >= 10 ? 'high' : 'medium', category: 'professionals', title: 'Profesionales sin actividad', description: `${m.inactiveProCount} profesional(es) sin reservas en 30 días.`, count: m.inactiveProCount, actionLabel: 'Ver profesionales' });
    }
    if (m.cancelRate >= 30) {
      alerts.push({ id: 'high-cancel', severity: m.cancelRate >= 50 ? 'critical' : 'high', category: 'bookings', title: 'Tasa de cancelación elevada', description: `${m.cancelRate}% de cancelaciones. Atención requerida.`, count: m.cancelledBookings, actionLabel: 'Ver citas' });
    }
    if (m.highCancelUserCount >= 1) {
      alerts.push({ id: 'suspicious-users', severity: 'medium', category: 'users', title: 'Usuarios con cancelaciones repetidas', description: `${m.highCancelUserCount} usuario(s) con 3+ cancelaciones.`, count: m.highCancelUserCount, actionLabel: 'Ver usuarios' });
    }
    if (m.recentGrowth < -10) {
      alerts.push({ id: 'growth-drop', severity: 'medium', category: 'revenue', title: 'Caída en nuevos registros', description: `Registros cayeron ${Math.abs(m.recentGrowth)}% vs el mes anterior.` });
    }
    if (m.pendingBookings > 20) {
      alerts.push({ id: 'pending', severity: 'low', category: 'bookings', title: 'Citas pendientes sin confirmar', description: `${m.pendingBookings} citas esperan confirmación.`, count: m.pendingBookings });
    }

    return alerts;
  }

  generateChatReply(intent: string, m: BusinessMetrics): string {
    const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    const map: Record<string, string> = {
      bookings: `📅 **${m.totalBookings}** citas totales — ${m.completedBookings} completadas (${m.bookingRate}%), ${m.cancelledBookings} canceladas (${m.cancelRate}%), ${m.pendingBookings} pendientes.`,
      revenue: `💰 Ingresos totales: **${fmt(m.totalRevenue)}**. Tasa de completación: ${m.bookingRate}%.`,
      users: `👥 **${m.totalUsers}** usuarios — ${m.activeUsers} activos en 30 días. ${m.highCancelUserCount} con cancelaciones repetidas.`,
      professionals: `🎨 **${m.totalProfessionals}** profesionales — ${m.activeProfessionals} activos, ${m.inactiveProCount} sin actividad reciente.`,
      services: `✂️ Servicio más solicitado: **"${m.topService}"**. Rating promedio: ${m.avgRating.toFixed(1)} ⭐.`,
      cancellations: `❌ Tasa de cancelación: **${m.cancelRate}%** (${m.cancelledBookings}/${m.totalBookings}). ${m.cancelRate >= 30 ? '⚠️ Por encima del umbral recomendado.' : 'Dentro de rango aceptable.'}`,
      ratings: `⭐ Rating promedio de profesionales: **${m.avgRating.toFixed(2)}/5**.`,
      general: `🤖 Puedo ayudarte con **reservas**, **ingresos**, **usuarios**, **profesionales** o **servicios**. ¿Qué quieres saber?`,
    };
    return map[intent] ?? map.general;
  }
}
