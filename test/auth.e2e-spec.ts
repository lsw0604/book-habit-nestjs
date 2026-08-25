import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface AuthMeBody {
  data: { user: { email: string } };
}

// signup -> login -> me -> refresh -> logout으로 이어지는 인증 흐름을
// 실제 DB/JWT/httpOnly 쿠키로 검증한다. 이 경로의 AccessTokenGuard/
// RefreshTokenGuard는 단위 테스트로는 커버되지 않는 영역(가드는 Nest DI
// 컨텍스트 밖에서 mock하기 어려움)이라 e2e에서만 실제로 401을 막는지 확인된다.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testUser = {
    email: `e2e-auth-${Date.now()}@example.com`,
    password: 'password1234',
    name: 'e2e 테스터',
  };

  // 다음 요청에 보낼 "name=value"만 필요할 때 사용 (Set-Cookie의 속성은 제외).
  function extractCookie(setCookieHeader: string[], name: string): string {
    return findRawCookie(setCookieHeader, name).split(';')[0];
  }

  // Expires/Max-Age 같은 속성까지 포함한 Set-Cookie 원문 전체가 필요할 때 사용.
  function findRawCookie(setCookieHeader: string[], name: string): string {
    const cookie = setCookieHeader.find((c) => c.startsWith(`${name}=`));
    if (!cookie) {
      throw new Error(`${name} 쿠키가 응답에 없습니다.`);
    }
    return cookie;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  it('회원가입에 성공하면 유저 정보를 반환하고 access/refresh 쿠키를 발급한다', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send(testUser)
      .expect(201);

    const body = res.body as AuthMeBody;
    expect(body.data.user.email).toBe(testUser.email);
    expect(body.data.user).not.toHaveProperty('password');

    const setCookie = res.get('Set-Cookie') as unknown as string[];
    expect(extractCookie(setCookie, 'access_token')).toBeTruthy();
    expect(extractCookie(setCookie, 'refresh_token')).toBeTruthy();
  });

  it('이미 가입된 이메일로 재가입하면 409를 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send(testUser)
      .expect(409);
  });

  it('쿠키 없이 /auth/me를 호출하면 401을 반환한다', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('비밀번호가 틀리면 401을 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrong-password' })
      .expect(401);
  });

  describe('로그인 이후 흐름', () => {
    let accessTokenCookie: string;
    let refreshTokenCookie: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const setCookie = res.get('Set-Cookie') as unknown as string[];
      accessTokenCookie = extractCookie(setCookie, 'access_token');
      refreshTokenCookie = extractCookie(setCookie, 'refresh_token');
    });

    it('access_token 쿠키로 /auth/me를 호출하면 본인 정보를 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', [accessTokenCookie])
        .expect(200);

      const body = res.body as AuthMeBody;
      expect(body.data.user.email).toBe(testUser.email);
    });

    it('refresh_token 쿠키로 새 access_token을 재발급한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', [refreshTokenCookie])
        .expect(200);

      const setCookie = res.get('Set-Cookie') as unknown as string[];
      const newAccessTokenCookie = extractCookie(setCookie, 'access_token');
      expect(newAccessTokenCookie).toBeTruthy();

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', [newAccessTokenCookie])
        .expect(200);
    });

    it('logout하면 access/refresh 쿠키를 만료시킨다', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', [accessTokenCookie, refreshTokenCookie])
        .expect(200);

      const setCookie = res.get('Set-Cookie') as unknown as string[];
      expect(findRawCookie(setCookie, 'access_token')).toMatch(
        /Expires=Thu, 01 Jan 1970/,
      );
      expect(findRawCookie(setCookie, 'refresh_token')).toMatch(
        /Expires=Thu, 01 Jan 1970/,
      );
    });
  });
});
