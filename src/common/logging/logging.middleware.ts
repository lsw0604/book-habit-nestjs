import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

export const REQUEST_ID_HEADER = 'X-Request-Id';

// 인터셉터가 아니라 미들웨어로 구현함: 인터셉터는 Guard를 통과한 요청에만
// 실행되므로 AccessTokenGuard(401)/ThrottlerGuard(429)에서 막힌 요청은
// 로그에 잡히지 않음. 미들웨어는 파이프라인 맨 앞에서 실행되므로 모든
// 요청을 빠짐없이 기록함.
//
// 요청마다 고유 id(request.id)를 부여해 응답 헤더(X-Request-Id)로 돌려주고
// 로그에도 같이 찍는다 - 사용자가 "이 시각에 에러 났어요"라고 하면 이 id로
// 이 접근 로그 줄과 ResponseExceptionFilter의 에러 스택트레이스 로그 줄을
// 같은 요청으로 연결해서 추적할 수 있다.
export function loggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const requestId = randomUUID();
  request.id = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);

  const { method, originalUrl } = request;
  const start = Date.now();

  response.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.log(
      `[${requestId}] ${method} ${originalUrl} ${response.statusCode} ${durationMs}ms`,
    );
  });

  next();
}
