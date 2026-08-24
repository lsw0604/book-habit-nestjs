import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

// 인터셉터가 아니라 미들웨어로 구현함: 인터셉터는 Guard를 통과한 요청에만
// 실행되므로 AccessTokenGuard(401)/ThrottlerGuard(429)에서 막힌 요청은
// 로그에 잡히지 않음. 미들웨어는 파이프라인 맨 앞에서 실행되므로 모든
// 요청을 빠짐없이 기록함.
export function loggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const { method, originalUrl } = request;
  const start = Date.now();

  response.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.log(
      `${method} ${originalUrl} ${response.statusCode} ${durationMs}ms`,
    );
  });

  next();
}
