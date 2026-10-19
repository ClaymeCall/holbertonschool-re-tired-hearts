import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Every route is served under /v1 (no further versioning strategy for the MVP).
  app.setGlobalPrefix('v1');
  app.enableCors();

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
