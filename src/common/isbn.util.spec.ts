import { normalizeIsbn13 } from './isbn.util';

describe('normalizeIsbn13', () => {
  it.each([
    ['9788996991342', 'ISBN-13 그대로'],
    ['978-89-96991-34-2', '하이픈 제거'],
    ['  9788996991342  ', '앞뒤 공백 제거'],
    ['8996991341', 'ISBN-10을 같은 책의 ISBN-13으로 변환'],
    ['89-96991-34-1', '하이픈 포함 ISBN-10'],
  ])('%s -> 9788996991342 (%s)', (input) => {
    expect(normalizeIsbn13(input)).toBe('9788996991342');
  });

  it('979 프리픽스 ISBN도 허용한다', () => {
    expect(normalizeIsbn13('9791162540640')).toBe('9791162540640');
  });

  // 아래 값들은 모두 숫자 13자리라 ^\d{13}$ 검사는 통과한다.
  // 자릿수 검사로는 못 거르는 것들이라 이 테스트가 핵심이다.
  it.each([
    ['9772093051009', 'ISSN(977) - 잡지 EAN'],
    ['9790260000438', 'ISMN(9790) - 악보 EAN'],
    ['1111111111111', '체크섬이 맞지 않는 13자리'],
    ['9788996991343', '마지막 체크디지트만 틀린 값'],
  ])('%s는 null이다 (%s)', (input) => {
    expect(normalizeIsbn13(input)).toBeNull();
  });

  // 카카오 검색 응답은 ISBN10과 ISBN13을 공백으로 이어서 주는 경우가 있다.
  // 서버는 이 형태를 해석하지 않고 거부한다 (클라이언트가 13자리로 맞춰 보냄).
  it('ISBN10과 ISBN13이 공백으로 이어진 카카오 형식은 null이다', () => {
    expect(normalizeIsbn13('8996991341 9788996991342')).toBeNull();
  });

  it.each<[unknown, string]>([
    [undefined, 'undefined'],
    [null, 'null'],
    ['', '빈 문자열'],
    [9788996991342, '숫자 타입'],
    [{}, '객체'],
  ])('문자열이 아니거나 비어 있으면 null이다 (%s)', (input) => {
    expect(normalizeIsbn13(input)).toBeNull();
  });
});
