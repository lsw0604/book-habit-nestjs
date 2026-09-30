import { Data4LibraryLookupResDto } from './data4library-lookup-res.dto';
import type { Data4LibraryBookRaw } from './data4library.types';

// 2026-09-30 실제 srchDtlList 응답(isbn13=9788996991342)의 book 그대로.
function baseBook(
  overrides: Partial<Data4LibraryBookRaw> = {},
): Data4LibraryBookRaw {
  return {
    no: 1,
    bookname: '미움받을 용기 :자유롭고 행복한 삶을 위한 아들러의 가르침 ',
    authors: '기시미 이치로,전경아 옮김',
    publisher: '인플루엔셜',
    publication_date: '2014',
    publication_year: '2014',
    isbn: '8996991341',
    isbn13: '9788996991342',
    addition_symbol: '13180',
    vol: '',
    class_no: '189.2',
    class_nm: '철학 > 심리학 > 응용심리학 일반',
    description: '2015년 최다 판매 1위.',
    bookImageURL:
      'https://bookthumb-phinf.pstatic.net/cover/083/399/08339910.jpg?type=m1&udate=20180616',
    ...overrides,
  };
}

describe('Data4LibraryLookupResDto.from', () => {
  it('실제 응답을 Book 필드로 변환한다', () => {
    const dto = Data4LibraryLookupResDto.from(baseBook());

    expect(dto).toMatchObject({
      isbn: '9788996991342',
      title: '미움받을 용기',
      subTitle: '자유롭고 행복한 삶을 위한 아들러의 가르침',
      authors: ['기시미 이치로'],
      translators: ['전경아'],
      publisher: '인플루엔셜',
      description: '2015년 최다 판매 1위.',
      thumbnail: baseBook().bookImageURL,
      coverImage: baseBook().bookImageURL,
    });
  });

  it('publication_date가 연도만 있으면 1월 1일로 채우지 않고 null로 둔다', () => {
    expect(Data4LibraryLookupResDto.from(baseBook()).pubDate).toBeNull();
  });

  it('publication_date에 일자가 있으면 UTC 자정 Date로 변환한다', () => {
    const dto = Data4LibraryLookupResDto.from(
      baseBook({ publication_date: '2014-11-17' }),
    );

    expect(dto.pubDate?.toISOString()).toBe('2014-11-17T00:00:00.000Z');
  });

  it('빈 문자열 필드와 API가 제공하지 않는 필드는 null이다', () => {
    const dto = Data4LibraryLookupResDto.from(
      baseBook({ publisher: '', description: '', bookImageURL: '' }),
    );

    expect(dto.publisher).toBeNull();
    expect(dto.description).toBeNull();
    expect(dto.thumbnail).toBeNull();
    expect(dto.coverImage).toBeNull();
    expect(dto.totalPage).toBeNull();
    expect(dto.url).toBeNull();
  });

  it('Book 모델에 그대로 넣을 수 있도록 Book 필드만 가진다', () => {
    expect(
      Object.keys(Data4LibraryLookupResDto.from(baseBook())).sort(),
    ).toEqual(
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
