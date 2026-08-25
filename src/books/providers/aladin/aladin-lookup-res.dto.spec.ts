import { AladinLookupResDto } from './aladin-lookup-res.dto';
import type { AladinDocumentRaw } from './aladin.types';

function baseDoc(
  overrides: Partial<AladinDocumentRaw> = {},
): AladinDocumentRaw {
  return {
    title: '미움받을 용기',
    link: 'https://aladin.co.kr/item/1',
    author: '기시미 이치로, 고가 후미타케',
    pubDate: '2014-11-17',
    description: '설명',
    isbn: '9788996991342',
    isbn13: '9788996991342',
    itemId: 1,
    priceSales: 10000,
    priceStandard: 12000,
    mallType: 'BOOK',
    stockStatus: '',
    mileage: 100,
    cover: 'https://image.aladin.co.kr/product/cover/1.jpg',
    categoryId: 1,
    categoryName: '자기계발',
    publisher: '인플루엔셜',
    salesPoint: 100,
    adult: false,
    fixedPrice: true,
    customerReviewRank: 9,
    subInfo: { subTitle: '', originalTitle: '', itemPage: 240 },
    ...overrides,
  };
}

describe('AladinLookupResDto.from', () => {
  it('author를 저자/번역자로 분리한다 (번역자 키워드 없음)', () => {
    const dto = AladinLookupResDto.from(baseDoc());

    expect(dto.authors).toEqual(['기시미 이치로', '고가 후미타케']);
    expect(dto.translators).toEqual([]);
  });

  it('번역자 키워드가 포함된 author를 translators로 분리한다', () => {
    const dto = AladinLookupResDto.from(
      baseDoc({ author: '기시미 이치로 (지은이), 전경아 (옮긴이)' }),
    );

    expect(dto.authors).toEqual(['기시미 이치로']);
    expect(dto.translators).toEqual(['전경아']);
  });

  it('author가 빈 문자열이면 저자/번역자 모두 빈 배열이다', () => {
    const dto = AladinLookupResDto.from(baseDoc({ author: '' }));

    expect(dto.authors).toEqual([]);
    expect(dto.translators).toEqual([]);
  });

  it('cover URL을 thumbnail(200)/coverImage(500)로 각각 치환한다', () => {
    const dto = AladinLookupResDto.from(
      baseDoc({ cover: 'https://image.aladin.co.kr/product/cover/1.jpg' }),
    );

    expect(dto.thumbnail).toBe(
      'https://image.aladin.co.kr/product/cover200/1.jpg',
    );
    expect(dto.coverImage).toBe(
      'https://image.aladin.co.kr/product/cover500/1.jpg',
    );
  });

  it('cover가 없으면 thumbnail/coverImage 모두 null이다', () => {
    const dto = AladinLookupResDto.from(baseDoc({ cover: '' }));

    expect(dto.thumbnail).toBeNull();
    expect(dto.coverImage).toBeNull();
  });

  it('pubDate가 유효하면 Date로 변환한다', () => {
    const dto = AladinLookupResDto.from(baseDoc({ pubDate: '2014-11-17' }));

    expect(dto.pubDate).toBeInstanceOf(Date);
    expect(dto.pubDate?.getFullYear()).toBe(2014);
  });

  it('pubDate가 유효하지 않으면 null이다', () => {
    const dto = AladinLookupResDto.from(baseDoc({ pubDate: '' }));

    expect(dto.pubDate).toBeNull();
  });

  it('subInfo가 없으면 subTitle/totalPage를 안전하게 null로 채운다', () => {
    const dto = AladinLookupResDto.from(baseDoc({ subInfo: undefined }));

    expect(dto.subTitle).toBeNull();
    expect(dto.totalPage).toBeNull();
  });

  it('publisher/description/stockStatus/link가 falsy면 null로 정규화한다', () => {
    const dto = AladinLookupResDto.from(
      baseDoc({
        publisher: '',
        description: '',
        stockStatus: '',
        link: '',
      }),
    );

    expect(dto.publisher).toBeNull();
    expect(dto.description).toBeNull();
    expect(dto.stockStatus).toBeNull();
    expect(dto.url).toBeNull();
  });
});
