import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadApiConfig } from '@pci/config';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const config = loadApiConfig(process.env);
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: config.CORS_ORIGIN, credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(config.PORT);
  console.info(`Plataforma PCI API escuchando en http://localhost:${config.PORT}`);
}

bootstrap().catch((error) => {
  console.error('Error fatal al iniciar la API', error);
  process.exitCode = 1;
});
