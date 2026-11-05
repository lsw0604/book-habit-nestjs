import { parseUtcDate } from './book-metadata.util';

describe('parseUtcDate', () => {
  it.each(['20141117', '2014-11-17'])('"%s"를 UTC 자정으로 변환한다', (raw) => {
    expect(parseUtcDate(raw)?.toISOString()).toBe('2014-11-17T00:00:00.000Z');
  });

  it.each(['', '2014', '20250230', undefined])(
    '"%s"는 유효한 일자가 아니므로 null이다',
    (raw) => {
      expect(parseUtcDate(raw)).toBeNull();
    },
  );
});
