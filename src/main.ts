import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './infrastructure/swagger/swagger.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    setupSwagger(app);
  }

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3000;

  await app.listen(port);
  console.log(`Application running on http://localhost:${port}/api`);
  if (isDev) {
    console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
