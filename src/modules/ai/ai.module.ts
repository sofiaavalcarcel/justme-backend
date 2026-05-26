import { Module, Global } from '@nestjs/common';
import { AIProviderManager } from './providers/ai-provider.manager';
import { RedisCacheService } from './providers/redis-cache.service';

/**
 * AiModule
 * ─────────
 * Global module so AIProviderManager is injectable anywhere.
 */
@Global()
@Module({
  providers: [AIProviderManager, RedisCacheService],
  exports: [AIProviderManager, RedisCacheService],
})
export class AiModule {}
