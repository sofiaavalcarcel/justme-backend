import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaProvider } from './ollama.provider';
import { FallbackProvider } from './fallback.provider';
import type { BusinessMetrics, AiInsight } from '../../../admin/dto/ai.dto';

export type AiSource = 'ollama' | 'fallback';

/**
 * AIProviderManager
 * ──────────────────
 * Single entry point for all AI operations.
 * Tries local Ollama first; auto-falls back to TypeScript provider on any error.
 */
@Injectable()
export class AIProviderManager {
  private readonly logger = new Logger(AIProviderManager.name);
  private readonly ollama: OllamaProvider | null;
  private readonly fallback = new FallbackProvider();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('OLLAMA_URL');
    const model = this.config.get<string>('OLLAMA_MODEL');
    
    if (url && model) {
      this.ollama = new OllamaProvider(url, model);
      this.logger.log(`✅ Ollama provider initialized: ${model} en ${url}`);
    } else {
      this.ollama = null;
      this.logger.warn('⚠️  OLLAMA_URL o OLLAMA_MODEL no definidos — modo fallback-only');
    }
  }

  async getInsights(metrics: BusinessMetrics): Promise<{ insights: AiInsight[]; source: AiSource }> {
    if (this.ollama) {
      const start = Date.now();
      try {
        const insights = await this.ollama.generateInsights(metrics);
        this.logger.log(`Ollama insights OK (${Date.now() - start}ms)`);
        return { insights, source: 'ollama' };
      } catch (err: any) {
        this.logger.error(`Ollama insights FAILED — triggering fallback: ${err.message}`);
      }
    }
    return { insights: this.fallback.generateInsights(metrics), source: 'fallback' };
  }

  async getChatReply(intent: string, metrics: BusinessMetrics, userMessage: string): Promise<{ reply: string; source: AiSource }> {
    if (this.ollama) {
      const start = Date.now();
      try {
        const reply = await this.ollama.generateChatReply(intent, metrics, userMessage);
        this.logger.log(`Ollama chat OK (${Date.now() - start}ms)`);
        return { reply, source: 'ollama' };
      } catch (err: any) {
        this.logger.error(`Ollama chat FAILED — triggering fallback: ${err.message}`);
      }
    }
    const reply = this.fallback.generateChatReply(intent, metrics);
    return { reply, source: 'fallback' };
  }

  getAlerts(metrics: BusinessMetrics) {
    // Alerts are always generated locally — no AI needed (no cost)
    return this.fallback.generateAlerts(metrics);
  }
}
