import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { getAllowedOrigins, isOriginAllowed } from './common/cors.util';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate production environment requirements
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production.');
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-change-in-production') {
      logger.warn('⚠️ JWT_SECRET is using default value. Configure a dedicated JWT_SECRET in production.');
    }
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn('⚠️ SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is missing.');
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable graceful shutdown on SIGTERM / SIGINT (Render deploys & scaling)
  app.enableShutdownHooks();

  // Local storage fallback: serve static evidence uploads if directory exists
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch {
      // Ignore if read-only filesystem
    }
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  // Global validation pipe — strips unknown fields, transforms class instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Dynamic CORS configuration supporting Vercel frontend and local development
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from disallowed origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Port resolution: Render PORT > API_PORT > 4000
  const rawPort = process.env.PORT ?? process.env.API_PORT ?? '4000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `Invalid port configuration: "${rawPort}". PORT must be a valid integer between 1 and 65535.`,
    );
  }

  // Render requires binding to 0.0.0.0
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Swiggy Unified Recovery API listening on 0.0.0.0:${port}`);
  logger.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();
