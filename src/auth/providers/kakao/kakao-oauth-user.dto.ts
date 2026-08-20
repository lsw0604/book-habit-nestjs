import type { KakaoUserInfoResponse } from './kakao-oauth.types';

export class KakaoOAuthUserDto {
  email: string;
  name: string;
  profile: string;

  static from(raw: KakaoUserInfoResponse): KakaoOAuthUserDto {
    const { id, kakao_account } = raw;

    return {
      email: `${id}@oauth.kakao.com`,
      name: `kakao_${id}`,
      profile: kakao_account?.profile?.thumbnail_image_url ?? '',
    };
  }
}
