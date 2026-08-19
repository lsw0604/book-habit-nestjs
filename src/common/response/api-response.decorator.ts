import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseDto } from './response.dto';

// ResponseDtoInterceptor가 실제로 응답을 { success, statusCode, message, data }로
// 감싸는데, 컨트롤러 메서드에 @ApiOkResponse({ type: Dto })만 붙이면 Swagger는
// data가 감싸지지 않은 것처럼 문서화함. 이 데코레이터는 그 wrapping을 스키마에
// 그대로 반영해서 실제 응답 모양과 문서를 일치시킴.
export const ApiResponseDto = <TModel extends Type>(
  model: TModel,
  options?: { isArray?: boolean; description?: string },
) =>
  applyDecorators(
    ApiExtraModels(ResponseDto, model),
    ApiOkResponse({
      description: options?.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseDto) },
          {
            properties: {
              data: options?.isArray
                ? { type: 'array', items: { $ref: getSchemaPath(model) } }
                : { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
