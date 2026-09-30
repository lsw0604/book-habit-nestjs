import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { BookLookupService } from './book-lookup.service';
import { BookLookupResDto } from './dto/book-lookup-res.dto';
import { KakaoBookSearchService, NlBookSearchService } from './providers';

function book(overrides: Partial<BookLookupResDto> = {}): BookLookupResDto {
  return {
    isbn: '9788924183429',
    title: '트렌드 코리아2026',
    subTitle: null,
    authors: ['고종문'],
    translators: [],
    publisher: '퍼플',
    pubDate: new Date('2025-11-17T00:00:00.000Z'),
    description: null,
    thumbnail: null,
    coverImage: null,
    url: null,
    totalPage: null,
    ...overrides,
  };
}

const kakaoBook = book({
  description: '카카오의 잘린 소개…',
  thumbnail: 'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=x',
  coverImage: 'https://t1.daumcdn.net/lbook/image/7093237',
  url: 'https://search.daum.net/search?w=bookpage&bookId=7093237',
});

const nlBook = book({
  publisher: 'NL 쪽 출판사 표기',
  subTitle: 'NL 부제',
  description: 'NL의 잘리지 않은 소개 전문',
  totalPage: 393,
});

describe('BookLookupService', () => {
  let service: BookLookupService;
  let kakao: { getByIsbn: jest.Mock };
  let nl: { getByIsbn: jest.Mock };

  beforeEach(async () => {
    kakao = { getByIsbn: jest.fn() };
    nl = { getByIsbn: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookLookupService,
        { provide: KakaoBookSearchService, useValue: kakao },
        { provide: NlBookSearchService, useValue: nl },
      ],
    }).compile();

    service = module.get(BookLookupService);
  });

  it('카카오를 기본으로 두고 NL에서 페이지 수/소개 전문/부제만 보충한다', async () => {
    kakao.getByIsbn.mockResolvedValue(kakaoBook);
    nl.getByIsbn.mockResolvedValue(nlBook);

    const result = await service.getByIsbn('9788924183429');

    expect(result).toEqual({
      ...kakaoBook,
      subTitle: 'NL 부제',
      totalPage: 393,
      description: 'NL의 잘리지 않은 소개 전문',
    });
    // 표지/출판사 등 나머지는 카카오 값을 유지한다.
    expect(result.publisher).toBe(kakaoBook.publisher);
    expect(result.coverImage).toBe(kakaoBook.coverImage);
  });

  it('NL에 소개가 없으면 카카오의 잘린 소개를 쓴다', async () => {
    kakao.getByIsbn.mockResolvedValue(kakaoBook);
    nl.getByIsbn.mockResolvedValue(book({ description: null }));

    const result = await service.getByIsbn('9788924183429');

    expect(result.description).toBe('카카오의 잘린 소개…');
  });

  it('두 API를 동시에 호출한다', async () => {
    let resolveKakao: (value: BookLookupResDto) => void = () => undefined;
    kakao.getByIsbn.mockReturnValue(
      new Promise((resolve) => {
        resolveKakao = resolve;
      }),
    );
    nl.getByIsbn.mockResolvedValue(nlBook);

    const pending = service.getByIsbn('9788924183429');

    // 카카오 응답을 기다리는 동안 NL도 이미 호출되어 있어야 한다.
    expect(nl.getByIsbn).toHaveBeenCalledWith('9788924183429');
    resolveKakao(kakaoBook);
    await pending;
  });

  it.each([
    ['책 없음(404)', new NotFoundException()],
    ['장애(502)', new BadGatewayException()],
  ])('NL이 실패해도(%s) 카카오 결과로 등록을 계속한다', async (_, error) => {
    kakao.getByIsbn.mockResolvedValue(kakaoBook);
    nl.getByIsbn.mockRejectedValue(error);

    await expect(service.getByIsbn('9788924183429')).resolves.toEqual(
      kakaoBook,
    );
  });

  it('카카오에 없는 책(전자책 등)은 NL 단독으로 만든다', async () => {
    kakao.getByIsbn.mockRejectedValue(new NotFoundException());
    nl.getByIsbn.mockResolvedValue(nlBook);

    await expect(service.getByIsbn('9788924183429')).resolves.toEqual(nlBook);
  });

  it('카카오 장애는 NL로 대신하지 않고 그대로 실패시킨다(표지 없는 Book이 영구히 남지 않도록)', async () => {
    const error = new BadGatewayException('카카오 도서 검색에 실패했습니다.');
    kakao.getByIsbn.mockRejectedValue(error);
    nl.getByIsbn.mockResolvedValue(nlBook);

    await expect(service.getByIsbn('9788924183429')).rejects.toBe(error);
  });

  it.each([
    ['NL도 없음', new NotFoundException()],
    ['NL은 장애', new BadGatewayException()],
  ])(
    '카카오에 없고 NL로도 만들 수 없으면 NotFoundException을 던진다 (%s)',
    async (_, nlError) => {
      kakao.getByIsbn.mockRejectedValue(new NotFoundException());
      nl.getByIsbn.mockRejectedValue(nlError);

      await expect(service.getByIsbn('9788924183429')).rejects.toThrow(
        NotFoundException,
      );
    },
  );
});
