import { KakaoLookupResDto } from './kakao-lookup-res.dto';
import type { KakaoDocument } from './kakao.types';

// 2026-09-30 카카오 target=isbn 실제 응답(isbn=9788996991342). contents만 줄임.
function realDoc(overrides: Partial<KakaoDocument> = {}): KakaoDocument {
  return {
    authors: ['기시미 이치로', '고가 후미타케'],
    contents:
      '어릴 때부터 성격이 어두워 사람들과 쉽게 친해지지 못하는 사람이 있다.',
    datetime: '2014-11-17T00:00:00.000+09:00',
    isbn: '8996991341 9788996991342',
    price: 14900,
    publisher: '인플루엔셜',
    sale_price: 13410,
    status: '정상판매',
    thumbnail:
      'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F1467038%3Ftimestamp%3D20230128141840',
    title: '미움받을 용기',
    translators: ['전경아'],
    url: 'https://search.daum.net/search?w=bookpage&amp;bookId=1467038&amp;q=%EB%AF%B8%EC%9B%80%EB%B0%9B%EC%9D%84+%EC%9A%A9%EA%B8%B0',
    ...overrides,
  };
}

describe('KakaoLookupResDto.from', () => {
  it('실제 응답을 Book 필드로 변환한다', () => {
    const dto = KakaoLookupResDto.from(realDoc(), '9788996991342');

    expect(dto).toEqual({
      isbn: '9788996991342',
      title: '미움받을 용기',
      subTitle: null,
      authors: ['기시미 이치로', '고가 후미타케'],
      translators: ['전경아'],
      publisher: '인플루엔셜',
      pubDate: new Date('2014-11-17T00:00:00.000Z'),
      description:
        '어릴 때부터 성격이 어두워 사람들과 쉽게 친해지지 못하는 사람이 있다.',
      thumbnail: realDoc().thumbnail,
      coverImage:
        'https://t1.daumcdn.net/lbook/image/1467038?timestamp=20230128141840',
      url: 'https://search.daum.net/search?w=bookpage&bookId=1467038&q=%EB%AF%B8%EC%9B%80%EB%B0%9B%EC%9D%84+%EC%9A%A9%EA%B8%B0',
      totalPage: null,
    });
  });

  it('KST 자정 datetime을 하루 밀리지 않은 UTC 자정 날짜로 바꾼다', () => {
    const dto = KakaoLookupResDto.from(realDoc(), '9788996991342');

    // new Date('2014-11-17T00:00:00.000+09:00')는 2014-11-16T15:00Z라 @db.Date에 16일로 저장된다.
    expect(dto.pubDate?.toISOString()).toBe('2014-11-17T00:00:00.000Z');
  });

  it('datetime/thumbnail/url이 비어 있으면 null이다', () => {
    const dto = KakaoLookupResDto.from(
      realDoc({ datetime: '', thumbnail: '', url: '' }),
      '9788996991342',
    );

    expect(dto.pubDate).toBeNull();
    expect(dto.thumbnail).toBeNull();
    expect(dto.coverImage).toBeNull();
    expect(dto.url).toBeNull();
  });

  it('Book 모델에 그대로 넣을 수 있도록 Book 필드만 가진다', () => {
    expect(
      Object.keys(KakaoLookupResDto.from(realDoc(), '9788996991342')).sort(),
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

describe('KakaoLookupResDto.toOriginalCover', () => {
  it('fname의 원본 주소를 꺼내 HTTPS로 바꾼다', () => {
    expect(
      KakaoLookupResDto.toOriginalCover(
        'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F7093237%3Ftimestamp%3D20251204151159',
      ),
    ).toBe(
      'https://t1.daumcdn.net/lbook/image/7093237?timestamp=20251204151159',
    );
  });

  it('HTTPS 지원을 확인하지 않은 호스트는 프로토콜을 바꾸지 않는다', () => {
    expect(
      KakaoLookupResDto.toOriginalCover(
        'https://search1.kakaocdn.net/thumb/R120x174/?fname=http%3A%2F%2Fexample.com%2F1.jpg',
      ),
    ).toBe('http://example.com/1.jpg');
  });

  it.each([
    ['https://example.com/cover.jpg', 'fname이 없는 URL'],
    ['not a url', 'URL이 아닌 값'],
  ])('원본을 꺼낼 수 없으면 thumbnail을 그대로 쓴다 (%s: %s)', (thumbnail) => {
    expect(KakaoLookupResDto.toOriginalCover(thumbnail)).toBe(thumbnail);
  });

  it('thumbnail이 없으면 null이다', () => {
    expect(KakaoLookupResDto.toOriginalCover(null)).toBeNull();
  });
});
