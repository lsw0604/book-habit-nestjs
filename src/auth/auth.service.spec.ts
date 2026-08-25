import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Provider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { KakaoOAuthService } from './providers';

jest.mock('bcrypt');

const CONFIG_VALUES: Record<string, string> = {
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
  KAKAO_CALLBACK_URL: 'https://example.com/auth/kakao/callback',
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: {
    create: jest.Mock;
    findByEmail: jest.Mock;
    createOAuthUser: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let kakaoOAuthService: { exchangeCodeForUserInfo: jest.Mock };
  const bcryptCompare = bcrypt.compare as unknown as jest.Mock;

  beforeEach(async () => {
    userService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      createOAuthUser: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(
        (_payload: unknown, options: { secret: string }) =>
          `signed:${options.secret}`,
      ),
    };
    kakaoOAuthService = { exchangeCodeForUserInfo: jest.fn() };
    bcryptCompare.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => CONFIG_VALUES[key] },
        },
        { provide: KakaoOAuthService, useValue: kakaoOAuthService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('signUp', () => {
    it('회원가입 후 access/refresh 토큰과 유저를 함께 반환한다', async () => {
      const user = { id: 1, email: 'a@a.com', name: '홍길동' };
      userService.create.mockResolvedValue(user);

      const result = await service.signUp({
        email: 'a@a.com',
        password: 'password1234',
        name: '홍길동',
      });

      expect(result.user).toBe(user);
      expect(result.token).toEqual({
        accessToken: 'signed:access-secret',
        refreshToken: 'signed:refresh-secret',
      });
    });
  });

  describe('login', () => {
    it('존재하지 않는 이메일이면 UnauthorizedException을 던진다', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login('a@a.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('소셜 가입이라 password가 없으면 UnauthorizedException을 던진다', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        password: null,
      });

      await expect(service.login('a@a.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('비밀번호가 일치하지 않으면 UnauthorizedException을 던진다', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        password: 'hashed',
      });
      bcryptCompare.mockResolvedValue(false);

      await expect(service.login('a@a.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('로그인에 성공하면 토큰과 password가 제거된 유저를 반환한다', async () => {
      userService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@a.com',
        name: '홍길동',
        password: 'hashed',
      });
      bcryptCompare.mockResolvedValue(true);

      const result = await service.login('a@a.com', 'password1234');

      expect(result.user).toEqual({ id: 1, email: 'a@a.com', name: '홍길동' });
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toEqual({
        accessToken: 'signed:access-secret',
        refreshToken: 'signed:refresh-secret',
      });
    });
  });

  describe('kakaoCallback', () => {
    const socialUserInfo = {
      providerId: 'kakao-1',
      email: 'kakao@example.com',
      name: '카카오유저',
    };

    it('처음 로그인하는 유저면 계정을 새로 만든다', async () => {
      kakaoOAuthService.exchangeCodeForUserInfo.mockResolvedValue(
        socialUserInfo,
      );
      userService.findByEmail.mockResolvedValue(null);
      const createdUser = {
        id: 2,
        email: socialUserInfo.email,
        name: socialUserInfo.name,
        password: null,
      };
      userService.createOAuthUser.mockResolvedValue(createdUser);

      const result = await service.kakaoCallback('auth-code');

      expect(kakaoOAuthService.exchangeCodeForUserInfo).toHaveBeenCalledWith(
        'auth-code',
        CONFIG_VALUES.KAKAO_CALLBACK_URL,
      );
      expect(userService.createOAuthUser).toHaveBeenCalledWith({
        ...socialUserInfo,
        provider: Provider.KAKAO,
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('같은 provider로 이미 가입된 유저면 재로그인 처리하고 새로 만들지 않는다', async () => {
      kakaoOAuthService.exchangeCodeForUserInfo.mockResolvedValue(
        socialUserInfo,
      );
      userService.findByEmail.mockResolvedValue({
        id: 3,
        email: socialUserInfo.email,
        name: socialUserInfo.name,
        provider: Provider.KAKAO,
        password: null,
      });

      await service.kakaoCallback('auth-code');

      expect(userService.createOAuthUser).not.toHaveBeenCalled();
    });

    it('같은 이메일로 다른 provider에 이미 가입돼 있으면 ConflictException을 던진다', async () => {
      kakaoOAuthService.exchangeCodeForUserInfo.mockResolvedValue(
        socialUserInfo,
      );
      userService.findByEmail.mockResolvedValue({
        id: 3,
        email: socialUserInfo.email,
        name: socialUserInfo.name,
        provider: Provider.LOCAL,
        password: 'hashed',
      });

      await expect(service.kakaoCallback('auth-code')).rejects.toThrow(
        ConflictException,
      );
      expect(userService.createOAuthUser).not.toHaveBeenCalled();
    });
  });

  describe('issueAccessToken', () => {
    it('JWT_ACCESS_SECRET으로 access token만 새로 서명한다', () => {
      const token = service.issueAccessToken({ sub: 1 });

      expect(token).toBe('signed:access-secret');
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 1 },
        expect.objectContaining({ secret: CONFIG_VALUES.JWT_ACCESS_SECRET }),
      );
    });
  });
});
