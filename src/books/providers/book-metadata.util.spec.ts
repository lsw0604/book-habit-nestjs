import {
  parseUtcDate,
  splitAuthorsByRole,
  splitTitle,
} from './book-metadata.util';

describe('splitAuthorsByRole', () => {
  it.each([
    [
      '기시미 이치로, 고가 후미타케 [공]지음 ; 전경아 옮김',
      ['기시미 이치로', '고가 후미타케'],
      ['전경아'],
    ],
    ['지은이: 기시미 이치로 ;옮긴이: 전경아', ['기시미 이치로'], ['전경아']],
    // 역할어는 ';'로 나뉜 그룹 전체에 적용된다 - 공동 번역자를 저자로 쪼개지 않는다.
    ['김철수, 이영희 옮김', [], ['김철수', '이영희']],
    ['기시미 이치로, 고가 후미타케', ['기시미 이치로', '고가 후미타케'], []],
    // 국립중앙도서관 전자책/오디오북 형식: 인물마다 "역할 : 이름;"
    ['저자 : 김난도;저자 : 전미영;낭독자 : 문형진;', ['김난도', '전미영'], []],
    ['김지역 지음', ['김지역'], []],
    ['', [], []],
  ])('"%s"를 저자/번역자로 분리한다', (raw, authors, translators) => {
    expect(splitAuthorsByRole(raw)).toEqual({ authors, translators });
  });
});

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

describe('splitTitle', () => {
  it('" :" 뒤를 부제로 분리한다', () => {
    expect(
      splitTitle('미움받을 용기 :자유롭고 행복한 삶을 위한 아들러의 가르침 '),
    ).toEqual({
      title: '미움받을 용기',
      subTitle: '자유롭고 행복한 삶을 위한 아들러의 가르침',
    });
  });

  it.each(['미움받을 용기', 'Re:Zero'])(
    '"%s"처럼 공백 뒤 콜론이 없으면 부제는 null이다',
    (raw) => {
      expect(splitTitle(raw)).toEqual({ title: raw, subTitle: null });
    },
  );
});
