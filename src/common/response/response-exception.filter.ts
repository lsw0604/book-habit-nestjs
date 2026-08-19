import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ResponseDto } from './response.dto';

// ResponseDtoInterceptor가 성공 응답을 { success, statusCode, message, data }로
// 감싸는 것과 짝을 맞추기 위한 필터. 이게 없으면 예외 응답만 Nest 기본 형태
// ({ statusCode, message, error })로 나가서 클라이언트가 success 필드로
// 분기할 때 실패 케이스를 구분하지 못함.
@Catch()
export class ResponseExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

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
