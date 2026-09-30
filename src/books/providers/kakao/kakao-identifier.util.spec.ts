import { parseKakaoIdentifier } from './kakao-identifier.util';

// 모두 2026-09-30 카카오 책 검색 실제 응답의 isbn 값.
describe('parseKakaoIdentifier', () => {
  it.each([
    ['8996991341 9788996991342', '9788996991342', 'ISBN10+ISBN13'],
    ['890048138X 9788900481389', '9788900481389', '체크 문자가 X인 ISBN10'],
    [' 9788924183429', '9788924183429', '앞에 공백이 붙은 ISBN13'],
    ['8996991341', '9788996991342', 'ISBN10만 있으면 ISBN13으로 변환'],
  ])('"%s"는 ISBN %s다 (%s)', (raw, isbn) => {
    expect(parseKakaoIdentifier(raw)).toEqual({
      isbn,
      identifierType: 'ISBN',
    });
  });

  it.each([
    ['9771228402006 9771228402006', 'ISSN이 두 번 들어 있음'],
    // 앞의 10자리는 isbn3가 유효한 ISBN-10으로 보고 9781228402005로 바꾸는 값이다.
    // 13자리가 ISSN이면 10자리를 보지 않아야 잡지가 엉뚱한 책이 되지 않는다.
    ['1228402000 9771228402006', 'ISSN에서 파생된 가짜 ISBN10'],
    ['1739361202 9771739361205', 'ISSN에서 파생된 가짜 ISBN10'],
  ])('"%s"는 ISSN이고 isbn은 null이다 (%s)', (raw) => {
    expect(parseKakaoIdentifier(raw)).toEqual({
      isbn: null,
      identifierType: 'ISSN',
    });
  });

  it.each<[string | undefined, string]>([
    [' 4801227003210', '내부 코드'],
    [' 480D211142010', '문자가 섞인 내부 코드'],
    ['9771228402007', '체크섬이 틀린 977 코드'],
    ['', '빈 문자열'],
    [undefined, 'undefined'],
  ])('"%s"는 UNKNOWN이다 (%s)', (raw) => {
    expect(parseKakaoIdentifier(raw)).toEqual({
      isbn: null,
      identifierType: 'UNKNOWN',
    });
  });
});
