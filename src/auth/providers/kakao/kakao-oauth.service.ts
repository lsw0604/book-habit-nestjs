import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  KakaoAccessTokenResponse,
  KakaoUserInfoResponse,
} from './kakao-oauth.types';
import { KakaoOAuthUserDto } from './kakao-oauth-user.dto';
import {
  SocialOAuthProvider,
  SocialOAuthUserInfo,
} from '../social-oauth.provider';

@Injectable()
export class KakaoOAuthService implements SocialOAuthProvider {
  private readonly logger = new Logger(KakaoOAuthService.name);
  private readonly AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
  private readonly TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
  private readonly ME_URL = 'https://kapi.kakao.com/v2/user/me';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // state는 호출자(AuthController)가 만들어 쿠키에도 심는 값을 그대로 받는다 -
  // 생성과 검증이 한 곳(컨트롤러)에 모여 있어야 대조가 성립하므로 여기서 만들지 않는다.
  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.configService.getOrThrow<string>('KAKAO_CLIENT_ID'),
      redirect_uri: this.configService.getOrThrow<string>('KAKAO_CALLBACK_URL'),
      response_type: 'code',
      state,
    });

    return `${this.AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCodeForUserInfo(
    code: string,
    redirectUri: string,
  ): Promise<SocialOAuthUserInfo> {
    const { access_token } = await this.getAccessToken(code, redirectUri);
    const kakaoUserInfo = await this.getUserInfo(access_token);

    return KakaoOAuthUserDto.from(kakaoUserInfo);
  }

  private async getAccessToken(
    code: string,
    redirectUri: string,
  ): Promise<KakaoAccessTokenResponse> {
    const body = this.buildTokenRequestBody(code, redirectUri);

    const { data } = await firstValueFrom(
      this.httpService
        .post<KakaoAccessTokenResponse>(this.TOKEN_URL, body, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `카카오 access token 발급 실패: ${JSON.stringify(error.response?.data)}`,
            );
            throw new BadGatewayException(
              '카카오 access token 발급에 실패했습니다.',
            );
          }),
        ),
    );

    return data;
  }

  private async getUserInfo(
    accessToken: string,
  ): Promise<KakaoUserInfoResponse> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<KakaoUserInfoResponse>(this.ME_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `카카오 사용자 정보 조회 실패: ${JSON.stringify(error.response?.data)}`,
            );
            throw new BadGatewayException(
              '카카오 사용자 정보 조회에 실패했습니다.',
            );
          }),
        ),
    );

    return data;
  }

  private buildTokenRequestBody(code: string, redirectUri: string): string {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append(
      'client_id',
      this.configService.getOrThrow<string>('KAKAO_CLIENT_ID'),
    );
    params.append('redirect_uri', redirectUri);
    params.append('code', code);

    // 카카오 콘솔에서 client_secret을 켠 앱만 이 값을 요구하고, 끈 앱에 빈 값을
    // 실어 보내면 오히려 KOE010으로 거절당하므로 설정돼 있을 때만 추가한다.
    const clientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }

    return params.toString();
  }
}
