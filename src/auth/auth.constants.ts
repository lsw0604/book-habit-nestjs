export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// signup/login/kakao-callback 공통 brute-force 방지용 rate limit
// (전역 기본치인 분당 100회보다 훨씬 강하게 제한).
export const AUTH_THROTTLE = { default: { limit: 5, ttl: 60000 } };

// api 전역 prefix('/api') 기준 auth 컨트롤러 경로. refresh/logout에서만
// refresh_token 쿠키가 브라우저에 의해 전송되도록 범위를 좁히기 위함.
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

// 카카오 인가 요청(GET /api/auth/kakao) 때 발급해서 콜백에서 한 번만 대조하는
// CSRF 방지용 state. sessionStorage 대신 httpOnly 쿠키에 담아 서버가 검증한다.
// 경로를 카카오 라우트로 좁혀 두면(콜백 /api/auth/kakao/callback도 이 경로에
// 매칭됨) 나머지 요청에는 실려 나가지 않고, 수명도 인가 페이지 왕복에 필요한
// 만큼(5분)만 준다.
export const KAKAO_OAUTH_STATE_COOKIE = 'kakao_oauth_state';
export const KAKAO_OAUTH_STATE_COOKIE_PATH = '/api/auth/kakao';
export const KAKAO_OAUTH_STATE_MAX_AGE_MS = 5 * 60 * 1000;

const DURATION_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// JWT_*_EXPIRES_IN 값('15m', '7d' 등)을 쿠키 maxAge(ms)로 재사용하기 위한 변환.
// @nestjs/jwt가 받는 형식의 부분집합(초/분/시/일)만 지원함.
export function parseExpiresInMs(expiresIn: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(expiresIn);

  if (!match) {
    throw new Error(`지원하지 않는 만료 시간 형식입니다: ${expiresIn}`);
  }

  const [, value, unit] = match;
  return Number(value) * DURATION_UNIT_MS[unit];
}
