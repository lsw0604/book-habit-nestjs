import { formatDateOnly } from './date-only.util';

describe('formatDateOnly', () => {
  it('UTC 자정 Date를 같은 날짜의 YYYY-MM-DD로 바꾼다', () => {
    expect(formatDateOnly(new Date('2014-11-17T00:00:00.000Z'))).toBe(
      '2014-11-17',
    );
  });

  it('null은 null로 둔다', () => {
    expect(formatDateOnly(null)).toBeNull();
  });
});
