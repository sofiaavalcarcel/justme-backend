import { Logger } from '@nestjs/common';
import axios from 'axios';
import type { BusinessMetrics, AiInsight } from '../../../admin/dto/ai.dto';
import { generateInsightsPrompt, generateChatPrompt } from '../prompts/insights.prompt';

export class OllamaProvider {
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(
    private readonly baseUrl: string,
    private readonly model: string
  ) {}

  async generateInsights(metrics: BusinessMetrics): Promise<AiInsight[]> {
    const prompt = generateInsightsPrompt(metrics);
    // Para qwen2.5-coder:1.5b agregamos instrucción ultra corta:
    const finalPrompt = `Responde en español y como un JSON estricto.\n\n${prompt}`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: finalPrompt,
        stream: false,
      }, { timeout: 20000 }); // Incrementar un poco el timeout

      let content = response.data.response || '';
      
      // Limpiar markdown residual (```json ... ```) y comentarios (// ...)
      content = content.replace(/```json/g, '').replace(/```/g, '');
      content = content.replace(/\/\/.*$/gm, '').trim();
      
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // Fallback muy agresivo si el modelo pequeño rompe el JSON
        const match = content.match(/\[.*\]/s) || content.match(/\{.*\}/s);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch (e2) { parsed = []; }
        } else {
          parsed = [];
        }
      }
      
      let rawArray: any[] = [];
      if (Array.isArray(parsed)) {
        rawArray = parsed;
      } else if (parsed && Array.isArray(parsed.insights)) {
        rawArray = parsed.insights;
      } else if (parsed && parsed.type && parsed.message) {
        rawArray = [parsed]; // Si devolvió un solo objeto en lugar de un array
      } else if (typeof parsed === 'object') {
        const arrayProp = Object.values(parsed).find(Array.isArray);
        if (arrayProp) rawArray = arrayProp as any[];
      }

      const insights = rawArray.slice(0, 2).map((item: any, i: number) => ({
        id: `ollama-insight-${i}-${Date.now()}`,
        type: ['info', 'warning', 'success', 'danger'].includes(item.type) ? item.type : 'info',
        message: item.message || 'Insight de métricas procesado.',
        metric: item.metric || ''
      }));

      if (!insights.length) {
        this.logger.warn(`Ollama output no pudo parsearse: ${content}`);
        this.throwError('Empty response');
      }
      return insights;
    } catch (err: any) {
      this.logger.error(`Ollama Error: ${err.message}`);
      throw err;
    }
  }

  async generateChatReply(intent: string, metrics: BusinessMetrics, userMessage: string): Promise<string> {
    const prompt = generateChatPrompt(intent, metrics, userMessage);
    const finalPrompt = `Eres un asistente administrativo. Se breve, máximo 2 oraciones.\n\n${prompt}`;

    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: this.model,
        prompt: finalPrompt,
        stream: false,
      }, { timeout: 10000 });

      return response.data.response || 'No se pudo generar respuesta.';
    } catch (err: any) {
      this.logger.error(`Ollama Error: ${err.message}`);
      throw err;
    }
  }

  private throwError(msg: string): never {
    throw new Error(msg);
  }
}
