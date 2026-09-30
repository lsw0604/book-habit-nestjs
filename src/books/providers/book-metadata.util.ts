// 국립중앙도서관 계열 API(ISBN 서지정보, 도서관 정보나루)가 공통으로 쓰는
// 서지 문자열을 Book 필드로 변환하는 헬퍼.

// 저자 문자열은 여러 형식으로 온다(모두 2026-09-30 실제 응답에서 확인).
// - 국립중앙도서관: "기시미 이치로, 고가 후미타케 [공]지음 ; 전경아 옮김",
//   "지은이: 고종문", 전자책/오디오북은 "저자 : 김난도;저자 : 전미영;낭독자 : 문형진;"
//   역할별 그룹을 ';'로 나누고, 그룹의 역할어가 그룹 전체에 적용된다.
//   낭독자(오디오북)는 저자도 번역자도 아니므로 버린다.
// - 정보나루: "기시미 이치로,전경아 옮김"
//   ';' 없이 ','로만 잇고 저자 역할어는 생략된다. 역할어는 바로 앞 인물에만
//   적용되므로 인물 하나하나를 그룹으로 본다.
//   그래서 "김철수, 이영희 옮김"(공동 번역)은 김철수를 저자로 잘못 분류한다.
//   정보나루 문자열만으로는 두 경우를 구분할 수 없다.
const TRANSLATOR_PATTERN =
  /옮김|옮긴이|역자|번역|편역|공역|(?:^|\s)역(?:$|\s|:)/;
const NON_CREATOR_PATTERN = /낭독/;
const ROLE_PREFIX_PATTERN = /^[^:]*:/;
const BRACKET_PATTERN = /\[[^\]]*\]|\([^)]*\)/g;
const TRAILING_ROLE_PATTERN =
  /\s+(?:지음|지은이|저|저자|공저|편저|글|그림|엮음|엮은이|편|옮김|옮긴이|역|역자|번역|편역|공역)$/;

export function splitAuthorsByRole(raw: string | undefined): {
  authors: string[];
  translators: string[];
} {
  const authors: string[] = [];
  const translators: string[] = [];
  if (!raw) return { authors, translators };

  const groups = raw.includes(';') ? raw.split(';') : raw.split(',');

  groups.forEach((group) => {
    if (NON_CREATOR_PATTERN.test(group)) return;

    const isTranslator = TRANSLATOR_PATTERN.test(group);
    const names = group
      .replace(ROLE_PREFIX_PATTERN, '')
      .replace(BRACKET_PATTERN, '')
      .trim()
      .replace(TRAILING_ROLE_PATTERN, '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    (isTranslator ? translators : authors).push(...names);
  });

  return { authors, translators };
}

// 'yyyymmdd' 또는 'yyyy-mm-dd'를 UTC 자정으로 변환한다. Book.pubDate는 @db.Date라
// UTC 기준으로 잘리므로, 로컬 자정으로 파싱하면 KST에서 하루 전 날짜로 저장된다.
// 연도만 있는 값('2014')은 1월 1일로 채우면 틀린 날짜가 되므로 null로 둔다.
export function parseUtcDate(raw: string | undefined): Date | null {
  const match = raw?.trim().match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (!match) return null;

  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // '20250230'이 3월 2일로 넘어가는 것을 막는다.
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

// 서지 표기(ISBD)에서는 본표제와 부제를 " :"로 잇는다
// (예: "미움받을 용기 :자유롭고 행복한 삶을 위한 아들러의 가르침 ").
// 앞에 공백이 있는 콜론만 구분자로 보므로 "Re:Zero"처럼 제목 안의 콜론은 나누지 않는다.
export function splitTitle(raw: string): {
  title: string;
  subTitle: string | null;
} {
  const [title, ...rest] = raw.split(/\s+:/);
  return {
    title: title.trim(),
    subTitle: rest.join(':').trim() || null,
  };
}
