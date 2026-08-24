import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  BadRequestException,
  INestApplication,
  Logger,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { loggingMiddleware } from './common';

// 처리되지 않은 동기 예외/Promise rejection이 발생하면 프로세스 상태를 더
// 신뢰할 수 없으므로, 조용히 계속 도는 대신 스택트레이스를 로깅하고 종료시킴 -
// 프로세스 매니저(Docker/PM2 등)가 재시작해서 깨끗한 상태로 복구하는 게
// 오염된 상태로 계속 요청을 처리하는 것보다 안전함. 부팅(NestFactory.create)
// 중 발생하는 예외도 잡을 수 있도록 bootstrap() 호출보다 먼저 등록함.
function setUpProcessErrorHandlers() {
  const logger = new Logger('Process');

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(
      'Unhandled Rejection',
      reason instanceof Error ? reason.stack : String(reason),
    );
    process.exit(1);
  });
}

function setUpMiddleware(app: INestApplication) {
  app.use(loggingMiddleware);
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

// CORS_ORIGINS는 콤마로 구분된 허용 origin 목록(.env 참고). 필수 여부는
// envValidationSchema(ConfigModule)가 부팅 시점에 이미 검증하므로 여기서는
// 존재를 신뢰하고 파싱만 함.
function setUpCors(app: INestApplication) {
  const corsOriginsEnv = process.env.CORS_ORIGINS!;
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
  setUpProcessErrorHandlers();

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
