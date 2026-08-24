import * as Joi from 'joi';

// 부팅 시점에 필수 환경변수 누락을 조기에 실패시키기 위한 스키마.
// ALADIN_TTB_KEY/KAKAO_REST_API는 기존 코드에서 configService.get(옵셔널)으로
// 다루는 값이라 required에서 제외함 - 없어도 앱은 뜨고 해당 외부 API 호출
// 시점에만 실패함(BooksModule 참고).
// unknown(true): process.env에는 PATH 등 검증 대상이 아닌 시스템 변수가
// 대량으로 섞여 있어 스키마에 없는 키를 거부하면 안 됨.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(s|m|h|d)$/)
    .required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(s|m|h|d)$/)
    .required(),

  CORS_ORIGINS: Joi.string().required(),

  KAKAO_CLIENT_ID: Joi.string().required(),
  KAKAO_CALLBACK_URL: Joi.string().required(),

  ALADIN_TTB_KEY: Joi.string().allow('').optional(),
  KAKAO_REST_API: Joi.string().allow('').optional(),
}).unknown(true);
