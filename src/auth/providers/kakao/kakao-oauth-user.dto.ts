import type { KakaoUserInfoResponse } from './kakao-oauth.types';
import { KAKAO_SYNTHETIC_EMAIL_DOMAIN } from '../../../user/user.constants';

export class KakaoOAuthUserDto {
  email: string;
  name: string;
  profile: string;

  // 카카오 이메일 스코프는 비즈니스 인증이 필요해 실제 이메일을 못 받으므로,
  // kakao_id 기반 합성 이메일로 계정을 식별한다. 이 도메인은 로컬 회원가입에서
  // 예약어로 차단되어 있음 - user.constants.ts 참고.
  static from(raw: KakaoUserInfoResponse): KakaoOAuthUserDto {
    const { id, kakao_account } = raw;

    return {
      email: `${id}@${KAKAO_SYNTHETIC_EMAIL_DOMAIN}`,
      name: `kakao_${id}`,
      profile: kakao_account?.profile?.thumbnail_image_url ?? '',
    };
  }
}
