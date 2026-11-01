import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;

  onModuleInit() {
    const url = process.env['UPSTASH_REDIS_REST_URL'];
    const token = process.env['UPSTASH_REDIS_REST_TOKEN'];

    if (url && token) {
      try {
        this.client = new Redis({ url, token });
        this.available = true;
        this.logger.log('Upstash Redis REST client initialized');
        // Asynchronous non-blocking ping check
        this.client.ping()
          .then((res) => this.logger.log(`Upstash Redis ping response: ${res}`))
          .catch((err) => {
            this.logger.warn(`Upstash Redis ping failed: ${err.message}. Running in degraded cache mode.`);
            this.available = false;
          });
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Upstash Redis client: ${err.message}`);
        this.available = false;
      }
    } else {
      this.logger.log('Upstash Redis credentials omitted — running in optional no-redis mode');
      this.available = false;
    }
  }

  isAvailable(): boolean {
    return this.available && this.client !== null;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client || !this.available) return null;
    try {
      return await this.client.get<T>(key);
    } catch (err: any) {
      this.logger.warn(`Redis GET "${key}" failed: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<boolean> {
    if (!this.client || !this.available) return false;
    try {
      if (options?.ex) {
        await this.client.set(key, value, { ex: options.ex });
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`Redis SET "${key}" failed: ${err.message}`);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this.available) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err: any) {
      this.logger.warn(`Redis DEL "${key}" failed: ${err.message}`);
      return false;
    }
  }
}
