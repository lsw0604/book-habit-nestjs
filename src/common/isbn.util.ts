import ISBN from 'isbn3';

/**
 * 임의의 입력을 정규 ISBN-13 문자열로 변환한다. ISBN으로 해석할 수 없으면 null.
 *
 * isbn3가 한 번에 처리해주는 것들:
 * - 하이픈/공백 제거 ('978-89-96991-34-2' -> '9788996991342')
 * - ISBN-10 -> ISBN-13 변환 ('8996991341' -> '9788996991342') - 같은 책이
 *   두 개의 Book row로 갈라지는 걸 막는다
 * - 체크섬 검증 - '1111111111342' 같은 오타를 알라딘 호출 전에 거른다
 * - ISBN이 아닌 EAN-13 배제: 977(ISSN, 잡지)/9790(ISMN, 악보)은 13자리
 *   숫자라 단순 자릿수 검사(^\d{13}$)는 통과해버린다. 등록 그룹 범위를
 *   실제로 아는 isbn3에 맡기는 이유.
 *
 * Book.isbn이 @db.VarChar(13) unique이므로 저장/조회 양쪽 모두 이 함수를 거쳐야
 * 같은 책이 항상 같은 키로 매핑된다 (CreateMyBookDto와 by-isbn 조회가 공유).
 */
export function normalizeIsbn13(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const parsed = ISBN.parse(value.trim());

  return parsed?.isValid ? parsed.isbn13 : null;
}
