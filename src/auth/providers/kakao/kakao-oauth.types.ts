/**
 * 카카오 OAuth 유저 정보 응답 스펙 (v2/user/me)
 */
export interface KakaoUserInfoResponse {
  id: number;
  connected_at: Date;
  properties: {
    profile_image: string;
    thumbnail_image: string;
  };
  kakao_account: {
    profile_image_needs_agreement: boolean;
    profile: {
      thumbnail_image_url: string;
      profile_image_url: string;
      is_default_image: boolean;
    };
  };
}

/**
 * 카카오 OAuth Access Token 응답 스펙
 */
export interface KakaoAccessTokenResponse {
  access_token: string;
  token_type: string;
}
