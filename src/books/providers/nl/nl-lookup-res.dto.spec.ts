import { NlLookupResDto } from './nl-lookup-res.dto';
import type { NlDocumentRaw } from './nl.types';

function baseDoc(overrides: Partial<NlDocumentRaw> = {}): NlDocumentRaw {
  return {
    TITLE: '미움받을 용기',
    VOL: '',
    SERIES_TITLE: '',
    SERIES_NO: '',
    AUTHOR: '기시미 이치로, 고가 후미타케 [공]지음 ; 전경아 옮김',
    EA_ISBN: '9788996991342',
    EA_ADD_CODE: '03190',
    SET_ISBN: '',
    SET_ADD_CODE: '',
    SET_EXPRESSION: '',
    PUBLISHER: '인플루엔셜',
    EDITION_STMT: '',
    PRE_PRICE: '14900',
    KDC: '189',
    DDC: '',
    PAGE: '336',
    BOOK_SIZE: '',
    FORM: '종이책',
    PUBLISH_PREDATE: '20141117',
    SUBJECT: '',
    EBOOK_YN: 'N',
    CIP_YN: 'Y',
    CONTROL_NO: '',
    TITLE_URL: 'https://www.nl.go.kr/seoji/fu/ecip/dbfiles/CIP_FILES_TBL/1.jpg',
    BOOK_TB_CNT_URL: '',
    BOOK_INTRODUCTION_URL: '',
    BOOK_SUMMARY_URL: '',
    PUBLISHER_URL: '',
    INPUT_DATE: '20141101',
    UPDATE_DATE: '20141101',
    BOOK_INTRODUCTION: '책 소개',
    ...overrides,
  };
}

describe('NlLookupResDto.from', () => {
  it('AUTHOR를 ; 기준 역할 그룹으로 나눠 저자/번역자로 분리한다', () => {
    const dto = NlLookupResDto.from(baseDoc());

    expect(dto.authors).toEqual(['기시미 이치로', '고가 후미타케']);
    expect(dto.translators).toEqual(['전경아']);
  });

  it('"지은이: / 옮긴이:" 접두 형식도 분리한다', () => {
    const dto = NlLookupResDto.from(
      baseDoc({ AUTHOR: '지은이: 기시미 이치로 ; 옮긴이: 전경아' }),
    );

    expect(dto.authors).toEqual(['기시미 이치로']);
    expect(dto.translators).toEqual(['전경아']);
  });

  it('"역"으로 끝나는 이름은 번역자로 오인하지 않는다', () => {
    const dto = NlLookupResDto.from(baseDoc({ AUTHOR: '김지역 지음' }));

    expect(dto.authors).toEqual(['김지역']);
    expect(dto.translators).toEqual([]);
  });

  it('AUTHOR가 빈 문자열이면 저자/번역자 모두 빈 배열이다', () => {
    const dto = NlLookupResDto.from(baseDoc({ AUTHOR: '' }));

    expect(dto.authors).toEqual([]);
    expect(dto.translators).toEqual([]);
  });

  it.each([
    ['336', 336],
    ['336 p.', 336],
    ['xii, 336 p.', 336],
    ['336쪽', 336],
    ['', null],
    ['1책', null],
  ])('PAGE "%s"를 totalPage %p로 변환한다', (page, expected) => {
    expect(NlLookupResDto.from(baseDoc({ PAGE: page })).totalPage).toBe(
      expected,
    );
  });

  it('PUBLISH_PREDATE(yyyymmdd)를 UTC 자정 Date로 변환한다', () => {
    const dto = NlLookupResDto.from(baseDoc({ PUBLISH_PREDATE: '20141117' }));

    expect(dto.pubDate?.toISOString()).toBe('2014-11-17T00:00:00.000Z');
  });

  it.each(['', '2014', '20250230'])(
    'PUBLISH_PREDATE "%s"가 유효하지 않으면 null이다',
    (raw) => {
      expect(
        NlLookupResDto.from(baseDoc({ PUBLISH_PREDATE: raw })).pubDate,
      ).toBeNull();
    },
  );

  it('TITLE_URL을 thumbnail/coverImage에 그대로 쓰고, 없으면 null이다', () => {
    const withCover = NlLookupResDto.from(baseDoc());
    const withoutCover = NlLookupResDto.from(baseDoc({ TITLE_URL: '' }));

    expect(withCover.thumbnail).toBe(baseDoc().TITLE_URL);
    expect(withCover.coverImage).toBe(baseDoc().TITLE_URL);
    expect(withoutCover.thumbnail).toBeNull();
    expect(withoutCover.coverImage).toBeNull();
  });

  it('빈 문자열 필드와 API가 제공하지 않는 필드는 null이다', () => {
    const dto = NlLookupResDto.from(
      baseDoc({ PUBLISHER: '', BOOK_INTRODUCTION: '' }),
    );

    expect(dto.publisher).toBeNull();
    expect(dto.description).toBeNull();
    expect(dto.subTitle).toBeNull();
    expect(dto.url).toBeNull();
    expect(dto.stockStatus).toBeNull();
  });

  it('Book 모델에 그대로 넣을 수 있도록 Book 필드만 가진다', () => {
    expect(Object.keys(NlLookupResDto.from(baseDoc())).sort()).toEqual(
      [
        'isbn',
        'title',
        'subTitle',
        'authors',
        'translators',
        'publisher',
        'thumbnail',
        'coverImage',
        'description',
        'url',
        'pubDate',
        'totalPage',
        'stockStatus',
      ].sort(),
    );
  });
});
