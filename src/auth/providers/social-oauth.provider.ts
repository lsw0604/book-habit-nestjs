export interface SocialOAuthUserInfo {
  email: string;
  name: string;
  profile: string;
}

// provider별 OAuthService(KakaoOAuthService 등)가 구현해야 하는 계약.
// "code를 넘기면 우리 도메인이 쓸 수 있는 사용자 정보를 돌려준다"까지를
// provider 자신이 책임지고, AuthService는 그 결과만 갖고 로그인/가입을 처리한다.
// 새 provider(구글/네이버 등)를 추가할 때도 이 인터페이스만 구현하면 됨.
export interface SocialOAuthProvider {
  // 인가 페이지 URL 생성까지 provider가 책임진다 - client_id/redirect_uri 같은
  // provider 자격증명이 프론트 번들로 새어 나가지 않게 하려면 이 URL을 서버가
  // 만들어 302로 넘겨야 하기 때문.
  buildAuthorizeUrl(state: string): string;

  exchangeCodeForUserInfo(
    code: string,
    redirectUri: string,
  ): Promise<SocialOAuthUserInfo>;
}
