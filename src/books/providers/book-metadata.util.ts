// 외부 API의 서지 문자열을 Book 필드로 변환하는 헬퍼(카카오 출간일).

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
