import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './auth/auth.constants';

// 인증 스킴은 쿠키다. 예전에는 .addBearerAuth()가 있었는데 Bearer 헤더를 읽는
// 코드가 어디에도 없어서(AccessTokenStrategy는 쿠키만 본다) Swagger UI의
// Authorize에 토큰을 넣어도 아무 일이 없었다. 쿠키 스킴의 이름은
// auth.constants.ts의 쿠키 이름과 맞추고, 가드가 붙은 엔드포인트에는
// @ApiAccessCookieAuth()를 붙여야 "보호된 엔드포인트"로 표시된다.
//
// main.ts와 분리한 이유: 명세 파일만 뽑는 스크립트(docs 참고)가 이 설정을
// 그대로 import해야 한다. 각자 DocumentBuilder를 만들면 servers·securitySchemes가
// 조용히 갈라져서, 생성된 명세가 실제로 뜨는 서버와 달라진다.
export function buildSwaggerDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Book Habit API')
    .setDescription(
      [
        '독서 기록·스트릭·목표·서평·소셜을 다루는 Book Habit의 백엔드 API.',
        '',
        '- 모든 응답은 `{ success, statusCode, message, data }` 봉투로 감싸진다',
        '  (`ResponseDtoInterceptor`). 실패도 같은 모양이고 `data`가 없다.',
        '- 인증은 Bearer 헤더가 아니라 httpOnly 쿠키(`access_token`)다.',
        '  `refresh_token`은 `/api/auth` 경로에만 전송된다.',
        '- 교차 출처 호출은 `credentials: "include"`가 필요하다.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addServer('http://localhost:3000', '로컬 개발')
    // 세 번째 인자(securityName)를 생략하면 둘 다 기본 이름 'cookie'로 등록돼
    // 나중 것이 앞 것을 덮어쓴다. @ApiCookieAuth()가 참조하는 이름이기도 하므로
    // 쿠키 이름을 그대로 security 이름으로 쓴다.
    .addCookieAuth(
      ACCESS_TOKEN_COOKIE,
      {
        type: 'apiKey',
        in: 'cookie',
        name: ACCESS_TOKEN_COOKIE,
        description: '로그인 시 발급되는 httpOnly 쿠키',
      },
      ACCESS_TOKEN_COOKIE,
    )
    .addCookieAuth(
      REFRESH_TOKEN_COOKIE,
      {
        type: 'apiKey',
        in: 'cookie',
        name: REFRESH_TOKEN_COOKIE,
        description: 'POST /api/auth/refresh 전용 httpOnly 쿠키',
      },
      REFRESH_TOKEN_COOKIE,
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setUpSwagger(app: INestApplication) {
  SwaggerModule.setup('api', app, buildSwaggerDocument(app));
}
