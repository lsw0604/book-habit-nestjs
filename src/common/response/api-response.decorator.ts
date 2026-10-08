import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseDto } from './response.dto';

// ResponseDtoInterceptor가 실제로 응답을 { success, statusCode, message, data }로
// 감싸는데, 컨트롤러 메서드에 @ApiOkResponse({ type: Dto })만 붙이면 Swagger는
// data가 감싸지지 않은 것처럼 문서화함. 이 데코레이터는 그 wrapping을 스키마에
// 그대로 반영해서 실제 응답 모양과 문서를 일치시킴.
//
// status를 받는 이유: @HttpCode가 없는 POST는 Nest 기본값인 201로 응답하고
// 인터셉터가 res.statusCode를 읽으므로 봉투의 statusCode도 201이 된다.
// 기본값 200으로 고정해 두면 생성 엔드포인트 전부가 문서와 어긋난다.
// 그래서 생성에는 ApiCreatedResponseDto를 쓴다(아래).
export const ApiResponseDto = <TModel extends Type>(
  model: TModel,
  options?: {
    isArray?: boolean;
    description?: string;
    status?: HttpStatus;
  },
) =>
  applyDecorators(
    ApiExtraModels(ResponseDto, model),
    ApiResponse({
      status: options?.status ?? HttpStatus.OK,
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

/**
 * `@HttpCode` 없이 생성하는 `POST` 엔드포인트용. 실제 응답이 201이므로
 * 문서도 201로 맞춘다 — 호출부가 `ApiResponseDto(Dto, { status: 201 })`을
 * 매번 적지 않도록 이름을 따로 둔다.
 */
export const ApiCreatedResponseDto = <TModel extends Type>(
  model: TModel,
  options?: { isArray?: boolean; description?: string },
) => ApiResponseDto(model, { ...options, status: HttpStatus.CREATED });
