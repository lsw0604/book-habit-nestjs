import { mergeBookMetadata } from './book-merge-policy';

const ISBN = '9788996991342';

describe('mergeBookMetadata', () => {
  it('정책 순서대로 처음 값이 있는 출처를 고르고, isbn은 인자를 쓴다', () => {
    const result = mergeBookMetadata(ISBN, {
      kakao: { title: '카카오 제목', publisher: '카카오 출판사' },
      nl: { title: 'NL 제목', publisher: 'NL 출판사', subTitle: 'NL 부제' },
      yes24: { totalPage: 336 },
    });

    expect(result).toEqual({
      isbn: ISBN,
      title: '카카오 제목',
      subTitle: 'NL 부제',
      authors: [],
      translators: [],
      publisher: '카카오 출판사',
      pubDate: null,
      thumbnail: null,
      coverImage: null,
      url: null,
      totalPage: 336,
    });
  });

  it.each([
    ['null', null],
    ['빈 문자열', ''],
  ])('앞 출처 값이 %s이면 다음 출처로 넘어간다', (_, publisher) => {
    const result = mergeBookMetadata(ISBN, {
      kakao: { title: '제목', publisher },
      nl: { title: '제목', publisher: 'NL 출판사' },
    });

    expect(result.publisher).toBe('NL 출판사');
  });

  it('모든 출처의 배열이 비어 있으면 빈 배열이다(번역자가 없는 책)', () => {
    const result = mergeBookMetadata(ISBN, {
      kakao: { title: '제목', translators: [] },
      nl: { title: '제목', translators: [] },
    });

    expect(result.translators).toEqual([]);
  });

  it('url은 YES24에서만 가져온다(다른 출처에 값이 있어도 쓰지 않는다)', () => {
    const result = mergeBookMetadata(ISBN, {
      kakao: { title: '제목', url: 'https://search.daum.net/x' },
      nl: { title: '제목', url: 'https://example.com/nl' },
    });

    expect(result.url).toBeNull();
  });

  it('제목을 줄 출처가 없으면 던진다(기본 출처 확인 누락)', () => {
    expect(() =>
      mergeBookMetadata(ISBN, { yes24: { totalPage: 336 } }),
    ).toThrow();
  });
});
