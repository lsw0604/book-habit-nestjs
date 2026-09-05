import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import type { AxiosError } from 'axios';
import { KakaoOAuthService } from './kakao-oauth.service';
import { KAKAO_SYNTHETIC_EMAIL_DOMAIN } from '../../../user/user.constants';
import type {
  KakaoAccessTokenResponse,
  KakaoUserInfoResponse,
} from './kakao-oauth.types';
import { fakeAxiosResponse } from '../../../common/testing/test-helpers';

function fakeUserInfo(
  overrides: Partial<KakaoUserInfoResponse> = {},
): KakaoUserInfoResponse {
  return {
    id: 12345,
    connected_at: new Date('2026-01-01'),
    properties: { profile_image: '', thumbnail_image: '' },
    kakao_account: {
      profile_image_needs_agreement: false,
      profile: {
        thumbnail_image_url: 'https://img.kakao.com/thumb.jpg',
        profile_image_url: 'https://img.kakao.com/profile.jpg',
        is_default_image: false,
      },
    },
    ...overrides,
  };
}

const TOKEN_RESPONSE: KakaoAccessTokenResponse = {
  access_token: 'kakao-access-token',
  token_type: 'bearer',
};

describe('KakaoOAuthService', () => {
  let service: KakaoOAuthService;
  let httpService: { post: jest.Mock; get: jest.Mock };
  // client_secret은 설정 여부가 곧 분기라, 테스트별로 갈아끼울 수 있게 가변으로 둔다.
  let config: Record<string, string | undefined>;

  beforeEach(async () => {
    httpService = { post: jest.fn(), get: jest.fn() };
    config = {
      KAKAO_CLIENT_ID: 'fake-client-id',
      KAKAO_CALLBACK_URL: 'https://api.example.com/api/auth/kakao/callback',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KakaoOAuthService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => config[key],
            getOrThrow: (key: string) => config[key],
          },
        },
      ],
    }).compile();

    service = module.get(KakaoOAuthService);
  });

  describe('buildAuthorizeUrl', () => {
    // client_id/redirect_uri가 프론트 번들이 아니라 서버에서만 조립되는 게 이 설계의 핵심.
    it('client_id/redirect_uri/state를 담은 카카오 인가 URL을 만든다', () => {
      const url = new URL(service.buildAuthorizeUrl('state-uuid'));

      expect(url.origin + url.pathname).toBe(
        'https://kauth.kakao.com/oauth/authorize',
      );
      expect(url.searchParams.get('client_id')).toBe('fake-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://api.example.com/api/auth/kakao/callback',
      );
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('state')).toBe('state-uuid');
    });
  });

  function mockHappyPath(userInfo = fakeUserInfo()) {
    httpService.post.mockReturnValue(of(fakeAxiosResponse(TOKEN_RESPONSE)));
    httpService.get.mockReturnValue(of(fakeAxiosResponse(userInfo)));
  }

  describe('토큰 교환 요청', () => {
    it('authorization_code 그랜트로 code와 redirectUri를 담아 요청한다', async () => {
      mockHappyPath();

      await service.exchangeCodeForUserInfo(
        'auth-code',
        'https://example.com/callback',
      );

      const calls = httpService.post.mock.calls as unknown[][];
      const [, body] = calls[0] as [string, string];
      const params = new URLSearchParams(body);
      expect(params.get('grant_type')).toBe('authorization_code');
      expect(params.get('client_id')).toBe('fake-client-id');
      expect(params.get('redirect_uri')).toBe('https://example.com/callback');
      expect(params.get('code')).toBe('auth-code');
    });

    // 콘솔에서 client_secret을 끈 앱에 빈 값을 실어 보내면 KOE010으로 거절당하므로,
    // '설정 안 됨'과 '설정됨'이 서로 다른 요청 본문을 만들어야 한다.
    it('KAKAO_CLIENT_SECRET이 없으면 client_secret을 보내지 않는다', async () => {
      mockHappyPath();

      await service.exchangeCodeForUserInfo('auth-code', 'https://cb');

      const calls = httpService.post.mock.calls as unknown[][];
      const [, body] = calls[0] as [string, string];
      expect(new URLSearchParams(body).has('client_secret')).toBe(false);
    });

    it('KAKAO_CLIENT_SECRET이 설정돼 있으면 client_secret을 함께 보낸다', async () => {
      config.KAKAO_CLIENT_SECRET = 'fake-client-secret';
      mockHappyPath();

      await service.exchangeCodeForUserInfo('auth-code', 'https://cb');

      const calls = httpService.post.mock.calls as unknown[][];
      const [, body] = calls[0] as [string, string];
      expect(new URLSearchParams(body).get('client_secret')).toBe(
        'fake-client-secret',
      );
    });

    it('발급받은 access token을 Bearer로 사용자 정보 조회에 사용한다', async () => {
      mockHappyPath();

      await service.exchangeCodeForUserInfo('auth-code', 'https://cb');

      const calls = httpService.get.mock.calls as unknown[][];
      const [, config] = calls[0] as [
        string,
        { headers: { Authorization: string } },
      ];
      expect(config.headers.Authorization).toBe('Bearer kakao-access-token');
    });
  });

  describe('합성 이메일 생성', () => {
    // 카카오는 비즈니스 인증 없이 실제 이메일을 주지 않으므로 kakao_id로 합성한다.
    // 이 도메인은 로컬 회원가입에서 예약어로 차단되어야 계정 연결 혼동을 막을 수 있다.
    it('kakao_id 기반으로 합성 이메일과 이름을 만든다', async () => {
      mockHappyPath(fakeUserInfo({ id: 98765 }));

      const result = await service.exchangeCodeForUserInfo(
        'code',
        'https://cb',
      );

      expect(result.email).toBe(`98765@${KAKAO_SYNTHETIC_EMAIL_DOMAIN}`);
      expect(result.name).toBe('kakao_98765');
      expect(result.profile).toBe('https://img.kakao.com/thumb.jpg');
    });

    it('프로필 이미지 동의를 받지 못했으면 profile을 빈 문자열로 둔다', async () => {
      mockHappyPath(
        fakeUserInfo({
          kakao_account:
            undefined as unknown as KakaoUserInfoResponse['kakao_account'],
        }),
      );

      const result = await service.exchangeCodeForUserInfo(
        'code',
        'https://cb',
      );

      expect(result.profile).toBe('');
    });
  });

  describe('외부 API 실패', () => {
    it('토큰 발급이 실패하면 BadGatewayException을 던지고 사용자 정보를 조회하지 않는다', async () => {
      httpService.post.mockReturnValue(
        throwError(() => ({ response: { data: 'error' } }) as AxiosError),
      );

      await expect(
        service.exchangeCodeForUserInfo('code', 'https://cb'),
      ).rejects.toThrow(BadGatewayException);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('사용자 정보 조회가 실패하면 BadGatewayException을 던진다', async () => {
      httpService.post.mockReturnValue(of(fakeAxiosResponse(TOKEN_RESPONSE)));
      httpService.get.mockReturnValue(
        throwError(() => ({ response: { data: 'error' } }) as AxiosError),
      );

      await expect(
        service.exchangeCodeForUserInfo('code', 'https://cb'),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
