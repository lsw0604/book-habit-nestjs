/**
 * 인기 태그 집계에 포함되려면 이 수 이상의 서로 다른 사용자가 그 태그를 써야 한다.
 *
 * `Tag`는 사용자가 자기 서재에 자유 입력한 값이라 "우리딸 추천"처럼 한 사람만 아는
 * 사적인 문자열일 수 있다. 붙은 책 수(`count`)로만 거르면 한 사용자가 여러 책에 붙인
 * 사적 태그가 그대로 공개 클라우드 상위에 뜬다 — 여러 사람이 공유하는 어휘만 공개한다.
 */
export const PUBLIC_TAG_MIN_DISTINCT_USERS = 2;

export const PUBLIC_TAG_DEFAULT_LIMIT = 20;
export const PUBLIC_TAG_MAX_LIMIT = 50;
