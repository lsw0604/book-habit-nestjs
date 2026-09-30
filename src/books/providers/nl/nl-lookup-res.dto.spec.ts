import { NlLookupResDto } from './nl-lookup-res.dto';
import type { NlDocumentRaw } from './nl.types';

function emptyDoc(): NlDocumentRaw {
  return {
    TITLE: '',
    VOL: '',
    SERIES_TITLE: '',
    SERIES_NO: '',
    AUTHOR: '',
    EA_ISBN: '',
    EA_ADD_CODE: '',
    SET_ISBN: '',
    SET_ADD_CODE: '',
    SET_EXPRESSION: '',
    PUBLISHER: '',
    EDITION_STMT: '',
    PRE_PRICE: '',
    KDC: '',
    DDC: '',
    PAGE: '',
    BOOK_SIZE: '',
    FORM: '',
    PUBLISH_PREDATE: '',
    SUBJECT: '',
    EBOOK_YN: '',
    CIP_YN: '',
    CONTROL_NO: '',
    TITLE_URL: '',
    BOOK_TB_CNT_URL: '',
    BOOK_INTRODUCTION_URL: '',
    BOOK_SUMMARY_URL: '',
    PUBLISHER_URL: '',
    INPUT_DATE: '',
    UPDATE_DATE: '',
    BOOK_INTRODUCTION: '',
    REAL_PUBLISH_DATE: '',
  };
}

// 2026-09-30 실제 SearchApi 응답(isbn=9788924183429)에서 값이 있던 필드.
// 최근 종이책의 전형: 페이지/발행일/책소개는 있지만 표지(TITLE_URL)는 비어 있다.
function recentDoc(overrides: Partial<NlDocumentRaw> = {}): NlDocumentRaw {
  return {
    ...emptyDoc(),
    TITLE: '트렌드 코리아2026',
    AUTHOR: '지은이: 고종문',
    EA_ISBN: '9788924183429',
    PAGE: '393 p.',
    FORM: '종이책',
    PUBLISH_PREDATE: '20251117',
    REAL_PUBLISH_DATE: '20251117',
    EBOOK_YN: 'N',
    BOOK_INTRODUCTION: '“미래는 이미 우리 곁에 와 있다.”\r\n— 윌리엄 깁슨\r\n',
    ...overrides,
  };
}

// 2026-09-30 실제 SearchApi 응답(isbn=9788996991342)에서 값이 있던 필드.
// 오래된 책의 전형: 저자에 역할어가 없고 페이지/발행일/표지/책소개가 모두 비어 있다.
function oldDoc(): NlDocumentRaw {
  return {
    ...emptyDoc(),
    TITLE: '미움받을 용기',
    AUTHOR: '기시미 이치로, 고가 후미타케',
    EA_ISBN: '9788996991342',
    PUBLISHER: '(주)인플루엔셜',
    PRE_PRICE: '14900',
    BOOK_SIZE: '145*205',
    EBOOK_YN: 'N',
    INPUT_DATE: '20141024',
    UPDATE_DATE: '20170206',
  };
}

describe('NlLookupResDto.from', () => {
  it('최근 종이책 응답을 Book 필드로 변환한다', () => {
    const dto = NlLookupResDto.from(recentDoc());

    expect(dto).toMatchObject({
      isbn: '9788924183429',
      title: '트렌드 코리아2026',
      subTitle: null,
      authors: ['고종문'],
      translators: [],
      totalPage: 393,
      thumbnail: null,
      coverImage: null,
    });
    expect(dto.pubDate?.toISOString()).toBe('2025-11-17T00:00:00.000Z');
  });

  it('책소개의 \\r\\n 줄바꿈을 \\n으로 정리한다', () => {
    expect(NlLookupResDto.from(recentDoc()).description).toBe(
      '“미래는 이미 우리 곁에 와 있다.”\n— 윌리엄 깁슨',
    );
  });

  it('오래된 책처럼 대부분 비어 있는 응답도 가능한 필드만 채운다', () => {
    const dto = NlLookupResDto.from(oldDoc());

    expect(dto).toEqual({
      isbn: '9788996991342',
      title: '미움받을 용기',
      subTitle: null,
      authors: ['기시미 이치로', '고가 후미타케'],
      translators: [],
      publisher: '(주)인플루엔셜',
      pubDate: null,
      description: null,
      thumbnail: null,
      coverImage: null,
      totalPage: null,
      url: null,
    });
  });

  it('"역할 : 이름;" 반복 형식(전자책/오디오북)의 저자를 분리한다', () => {
    const dto = NlLookupResDto.from(
      recentDoc({ AUTHOR: '저자 : 김난도;저자 : 전미영;역자 : 홍길동;' }),
    );

    expect(dto.authors).toEqual(['김난도', '전미영']);
    expect(dto.translators).toEqual(['홍길동']);
  });

  it('TITLE의 " : " 뒤를 부제로 분리한다', () => {
    const dto = NlLookupResDto.from(
      recentDoc({ TITLE: '관계의 압력에서 사건을 읽다 : 최소한의 소설 읽기' }),
    );

    expect(dto.title).toBe('관계의 압력에서 사건을 읽다');
    expect(dto.subTitle).toBe('최소한의 소설 읽기');
  });

  it('실제 발행일이 없으면 발행예정일을 쓴다', () => {
    const dto = NlLookupResDto.from(
      recentDoc({ REAL_PUBLISH_DATE: '', PUBLISH_PREDATE: '20250925' }),
    );

    expect(dto.pubDate?.toISOString()).toBe('2025-09-25T00:00:00.000Z');
  });

  it('실제 발행일이 발행예정일과 다르면 실제 발행일을 쓴다', () => {
    const dto = NlLookupResDto.from(
      recentDoc({ REAL_PUBLISH_DATE: '20251201', PUBLISH_PREDATE: '20251117' }),
    );

    expect(dto.pubDate?.toISOString()).toBe('2025-12-01T00:00:00.000Z');
  });

  it.each([
    ['336', 336],
    ['393 p.', 393],
    ['xii, 336 p.', 336],
    ['336쪽', 336],
    ['', null],
    ['1책', null],
  ])('PAGE "%s"를 totalPage %p로 변환한다', (page, expected) => {
    expect(NlLookupResDto.from(recentDoc({ PAGE: page })).totalPage).toBe(
      expected,
    );
  });

  it('TITLE_URL이 있으면 thumbnail/coverImage에 그대로 쓴다', () => {
    const url =
      'https://www.nl.go.kr/seoji/fu/ecip/dbfiles/CIP_FILES_TBL/1.jpg';
    const dto = NlLookupResDto.from(recentDoc({ TITLE_URL: url }));

    expect(dto.thumbnail).toBe(url);
    expect(dto.coverImage).toBe(url);
  });

  it('Book 모델에 그대로 넣을 수 있도록 Book 필드만 가진다', () => {
    expect(Object.keys(NlLookupResDto.from(recentDoc())).sort()).toEqual(
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
      ].sort(),
    );
  });
});
