import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';

function setUpMiddleware(app: INestApplication) {
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}

function setUpSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Document')
    .setDescription('API 설명')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  setUpMiddleware(app);
  setUpSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
