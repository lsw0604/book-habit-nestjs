import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  BadRequestException,
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

function setUpMiddleware(app: INestApplication) {
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}

// CORS_ORIGINS는 콤마로 구분된 허용 origin 목록(.env 참고). 값이 없으면
// 배포 환경에서 CORS가 통째로 열리거나 막히는 걸 조용히 넘어가지 않도록
// 부팅 시점에 바로 실패시킴.
function setUpCors(app: INestApplication) {
  const corsOriginsEnv = process.env.CORS_ORIGINS;

  if (!corsOriginsEnv) {
    throw new Error('CORS_ORIGINS 환경변수가 설정되지 않았습니다.');
  }

  const allowOrigins = corsOriginsEnv
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (
        (origin !== undefined && allowOrigins.includes(origin)) ||
        (process.env.NODE_ENV !== 'production' && origin === undefined)
      ) {
        callback(null, true);
      } else {
        callback(
          new BadRequestException(`CORS Error : ${origin} is not allowed`),
        );
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
  };

  app.enableCors(corsOptions);
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

  // PrismaService.onModuleDestroy($disconnect)가 SIGTERM/SIGINT에도 호출되도록 함 -
  // 이게 없으면 배포 환경의 컨테이너 재시작 시 DB 커넥션이 정리되지 않은 채 프로세스만 죽음.
  app.enableShutdownHooks();

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  setUpMiddleware(app);
  setUpCors(app);
  setUpSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
