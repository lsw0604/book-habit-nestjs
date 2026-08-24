import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ResponseDto } from './response.dto';

// ResponseDtoInterceptor가 성공 응답을 { success, statusCode, message, data }로
// 감싸는 것과 짝을 맞추기 위한 필터. 이게 없으면 예외 응답만 Nest 기본 형태
// ({ statusCode, message, error })로 나가서 클라이언트가 success 필드로
// 분기할 때 실패 케이스를 구분하지 못함.
@Catch()
export class ResponseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ResponseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // HttpException으로 의도적으로 던진 4xx는 클라이언트 응답 메시지로 충분히
    // 파악되지만, 예상치 못한(5xx) 예외는 응답 메시지가 뭉뚱그려진("서버 내부
    // 오류가 발생했습니다") 채로 나가서 스택 트레이스를 로그로 남기지 않으면
    // 원인을 알 방법이 없다. request.id를 같이 찍어서 loggingMiddleware의
    // 접근 로그 줄과 같은 요청으로 연결해서 추적할 수 있게 함.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const detail =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${request.id}] ${detail}`);
    }

    const message = this.extractMessage(exception);

    response.status(statusCode).json(ResponseDto.error(message, statusCode));
  }

  private extractMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') return body;

      if (typeof body === 'object' && body !== null && 'message' in body) {
        const message = body.message;
        // ValidationPipe가 던지는 BadRequestException은 message가 string[]임
        if (Array.isArray(message)) return message.join(', ');
        if (typeof message === 'string') return message;
      }

      return exception.message;
    }

    return '서버 내부 오류가 발생했습니다';
  }
}
