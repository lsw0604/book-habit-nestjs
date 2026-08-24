// KakaoOAuthUserDto.from()이 실제 이메일 스코프(비즈니스 인증 필요) 없이
// `${kakao_id}@oauth.kakao.com` 형태로 합성해서 쓰는 예약 도메인.
// 로컬 회원가입이 이 도메인을 그대로 쓸 수 있으면, 공격자가 특정 카카오 유저의
// id를 미리 알고 그 이메일로 로컬 가입해둔 뒤 해당 유저의 첫 카카오 로그인을
// 가로채는 계정 연결 혼동이 가능해짐 - 그래서 로컬 가입/수정 양쪽에서 차단한다.
export const KAKAO_SYNTHETIC_EMAIL_DOMAIN = 'oauth.kakao.com';
