import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Response } from 'express';
import { ResponseDto } from './response.dto';
import { RESPONSE_MESSAGE_METADATA_KEY } from './response.constants';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ResponseDtoInterceptor<T> implements NestInterceptor<
  T,
  ResponseDto<T | null>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseDto<T | null>> {
    // 메타데이터에서 메시지 가져오기 (상태 코드는 HttpCode 데코레이터를 사용)
    const apiResponse = this.reflector.get<{ message?: string }>(
      RESPONSE_MESSAGE_METADATA_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data: T) => {
        const customMessage = apiResponse?.message;
        const statusCode = context
          .switchToHttp()
          .getResponse<Response>().statusCode;

        // HttpCode 데코레이터로 설정된 상태 코드를 사용
        if (statusCode === 201) {
          return ResponseDto.created(
            data,
            customMessage || '성공적으로 생성되었습니다',
          );
        } else if (statusCode === 204) {
          return ResponseDto.noContent(customMessage || '콘텐츠가 없습니다');
        }

        return ResponseDto.success(
          data,
          customMessage || '성공적으로 처리되었습니다',
        );
      }),
    );
  }
}
