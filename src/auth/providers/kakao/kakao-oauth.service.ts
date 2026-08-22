import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  KakaoAccessTokenResponse,
  KakaoUserInfoResponse,
} from './kakao-oauth.types';

@Injectable()
export class KakaoOAuthService {
  private readonly logger = new Logger(KakaoOAuthService.name);
  private readonly TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
  private readonly ME_URL = 'https://kapi.kakao.com/v2/user/me';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getAccessToken(
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

  async getUserInfo(accessToken: string): Promise<KakaoUserInfoResponse> {
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

    return params.toString();
  }
}
