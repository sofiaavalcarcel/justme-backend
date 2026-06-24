import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis;
  private isConnected = false;
  private hasLoggedError = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('config.redis.url');
    const host = this.config.get<string>('config.redis.host') || 'localhost';
    const port = this.config.get<number>('config.redis.port') || 6379;

    const redisOptions = {
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => {
        if (times > 1) return null;
        return 2000;
      },
    };

    this.client = redisUrl
      ? new Redis(redisUrl, redisOptions)
      : new Redis({ host, port, ...redisOptions });

    this.client.on('error', (err) => {
      this.isConnected = false;
      if (!this.hasLoggedError) {
        this.logger.warn(`Redis connection error: ${err.message}. Cache will be bypassed.`);
        this.hasLoggedError = true;
      }
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.hasLoggedError = false;
      this.logger.log('✅ Connected to Redis cache');
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      // Ignorar errores silenciosamente para no spamear
    }
  }
}
