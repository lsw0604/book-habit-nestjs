import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseDto } from './response.dto';

// 핸들러가 아무것도 반환하지 않는 엔드포인트(DELETE 전반, logout, refresh)용.
// 데코레이터를 아예 생략하면 Swagger가 본문 없는 빈 200으로 문서화하지만,
// 실제로는 ResponseDtoInterceptor가 봉투를 씌워 { success, statusCode, message }가
// 내려간다(data 키는 undefined라 JSON에서 빠진다). 그 차이를 메우는 용도다.
export const ApiVoidResponseDto = (description = '성공 (응답 data 없음)') =>
  applyDecorators(
    ApiExtraModels(ResponseDto),
    ApiResponse({
      status: HttpStatus.OK,
      description,
      schema: { $ref: getSchemaPath(ResponseDto) },
    }),
  );
