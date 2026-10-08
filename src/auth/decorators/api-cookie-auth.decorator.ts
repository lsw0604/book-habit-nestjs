import { ApiCookieAuth } from '@nestjs/swagger';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../auth.constants';

// 이 API의 인증은 Bearer 헤더가 아니라 httpOnly 쿠키다(AccessTokenStrategy가
// 쿠키만 읽는다). securitySchemes 이름을 쿠키 이름과 맞춰 두고, 가드가 붙은
// 컨트롤러/메서드에 아래 데코레이터를 붙여야 Swagger가 "보호된 엔드포인트"로
// 표시한다 - 안 붙이면 전부 공개 API처럼 읽힌다.
//
// OptionalAccessTokenGuard 쪽에는 일부러 붙이지 않는다. 비로그인도 정상
// 동작하는 엔드포인트라 security를 선언하면 "쿠키 필수"라는 거짓이 된다.
export const ApiAccessCookieAuth = () => ApiCookieAuth(ACCESS_TOKEN_COOKIE);

export const ApiRefreshCookieAuth = () => ApiCookieAuth(REFRESH_TOKEN_COOKIE);
