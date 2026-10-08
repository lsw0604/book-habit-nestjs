import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseDto } from './response.dto';

// ResponseExceptionFilter가 모든 예외를 ResponseDto.error()로 정규화하므로,
// 에러 응답의 스키마는 상태 코드와 무관하게 하나뿐이다(success:false +
// statusCode + message, data 없음). 그래서 엔드포인트마다 스키마를 쓰지 않고
// 이 데코레이터로 "어떤 상태 코드가 날 수 있는지"만 선언한다.
//
// description은 생략하지 않는다 - 상태 코드만 적으면 "왜 404가 나는지"를
// 문서에서 알 수 없고, 같은 404가 부모 리소스인지 본인 리소스인지 구분되지 않는다.
export const ApiErrorResponse = (status: HttpStatus, description: string) =>
  applyDecorators(
    ApiExtraModels(ResponseDto),
    ApiResponse({
      status,
      description,
      schema: { $ref: getSchemaPath(ResponseDto) },
    }),
  );

/**
 * 가드가 붙은 엔드포인트의 401. 모든 보호된 엔드포인트가 같은 이유로 같은
 * 응답을 내므로 문구를 여기서 한 번만 정한다.
 */
export const ApiUnauthorizedResponse = () =>
  ApiErrorResponse(
    HttpStatus.UNAUTHORIZED,
    'access_token 쿠키가 없거나 만료됨',
  );
