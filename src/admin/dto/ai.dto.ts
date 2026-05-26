import { IsString, IsNotEmpty } from 'class-validator';

// DTOs para el módulo de IA administrativa
export class AiChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class AiInsightsRequestDto {
  forceRefresh?: boolean;
}

export interface BusinessMetrics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  totalUsers: number;
  activeUsers: number;
  totalProfessionals: number;
  activeProfessionals: number;
  avgRating: number;
  topService: string;
  cancelRate: number;
  bookingRate: number;
  recentGrowth: number;
  inactiveProCount: number;
  highCancelUserCount: number;
}

export interface AiInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  message: string;
  metric?: string | number;
}

export interface AiAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'professionals' | 'users' | 'bookings' | 'revenue';
  title: string;
  description: string;
  count?: number;
  actionLabel?: string;
}

export interface ChatResponse {
  reply: string;
  source: 'ollama' | 'fallback';
  intent?: string;
}
