/**
 * @db.Date 컬럼 값(UTC 자정 Date)을 'YYYY-MM-DD'로 바꾼다. 출판일처럼 시각이 없는
 * 달력 날짜를 응답할 때 쓴다.
 *
 * Date를 그대로 응답하면 '2014-11-17T00:00:00.000Z'가 되고, 클라이언트가 new Date()로
 * 읽으면 UTC보다 느린 시간대에서 하루 전 날짜가 된다. 검색 결과(KakaoBookItemDto)가
 * 이미 'YYYY-MM-DD'로 보내므로, 같은 책의 상세·서재 응답도 같은 형식으로 맞춘다.
 */
export function formatDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
