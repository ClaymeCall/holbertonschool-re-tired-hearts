import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Secure headers (#67): HSTS, no-sniff, frame-deny, etc. `contentSecurityPolicy` is left at
  // helmet's default (on) — this is a JSON API with no HTML views of its own to break.
  app.use(helmet());

  // Every route is served under /v1 (no further versioning strategy for the MVP).
  app.setGlobalPrefix('v1');
  // `credentials: true` + an explicit origin (not `*`) so the browser will send/accept the
  // session cookie across the frontend/backend ports. Full env-driven CORS config is #72;
  // this dev-only default is enough for the auth cookie to work locally in the meantime.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });
  // The session token travels as an httpOnly cookie (docs/api-conventions.md#session-strategy).
  app.use(cookieParser());

  // Each request body is validated against its DTO. `whitelist` drops unknown fields and
  // `forbidNonWhitelisted` rejects them, so a client cannot send { "is_admin": true }.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // The OpenAPI contract is generated from the controllers and DTOs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Re-Tired Hearts API')
    .setDescription('REST API of the Re-Tired Hearts MVP')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('v1/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
