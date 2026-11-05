import { mergeBookMetadata } from './book-merge-policy';

const ISBN = '9788996991342';

describe('mergeBookMetadata', () => {
  it('필드마다 정책의 출처 값을 쓰고, isbn은 인자를 쓴다', () => {
    const result = mergeBookMetadata(ISBN, {
      kakao: { title: '카카오 제목', publisher: '카카오 출판사' },
      yes24: { totalPage: 336, url: 'https://www.yes24.com/product/goods/1' },
    });

    expect(result).toEqual({
      isbn: ISBN,
      title: '카카오 제목',
      authors: [],
      translators: [],
      publisher: '카카오 출판사',
      pubDate: null,
      thumbnail: null,
      coverImage: null,
      url: 'https://www.yes24.com/product/goods/1',
      totalPage: 336,
    });
  });

  it.each([
    ['null', null],
    ['빈 문자열', ''],
  ])('출처 값이 %s이면 값 없음(null)으로 둔다', (_, publisher) => {
    const result = mergeBookMetadata(ISBN, {
      kakao: { title: '제목', publisher },
    });

    expect(result.publisher).toBeNull();
  });

  it('배열이 비어 있으면 빈 배열이다(번역자가 없는 책)', () => {
    const result = mergeBookMetadata(ISBN, {
      kakao: { title: '제목', translators: [] },
    });

    expect(result.translators).toEqual([]);
  });

  it('YES24 patch가 없으면 쪽수와 링크는 null이다', () => {
    const result = mergeBookMetadata(ISBN, { kakao: { title: '제목' } });

    expect(result.totalPage).toBeNull();
    expect(result.url).toBeNull();
  });

  it('url은 YES24에서만 가져온다(다른 출처에 값이 있어도 쓰지 않는다)', () => {
    const result = mergeBookMetadata(ISBN, {
      kakao: { title: '제목', url: 'https://search.daum.net/x' },
    });

    expect(result.url).toBeNull();
  });

  it('제목을 줄 출처가 없으면 던진다(기본 출처 확인 누락)', () => {
    expect(() =>
      mergeBookMetadata(ISBN, { yes24: { totalPage: 336 } }),
    ).toThrow();
  });
});
