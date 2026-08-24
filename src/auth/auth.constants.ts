export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// signup/login/kakao-callback 공통 brute-force 방지용 rate limit
// (전역 기본치인 분당 100회보다 훨씬 강하게 제한).
export const AUTH_THROTTLE = { default: { limit: 5, ttl: 60000 } };

// api 전역 prefix('/api') 기준 auth 컨트롤러 경로. refresh/logout에서만
// refresh_token 쿠키가 브라우저에 의해 전송되도록 범위를 좁히기 위함.
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

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
