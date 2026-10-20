import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { BookLookupService } from './book-lookup.service';
import { BookLookupResDto } from './dto/book-lookup-res.dto';
import {
  type BookMetadataPatch,
  KakaoBookSearchService,
  NlBookSearchService,
  Yes24BookSearchService,
} from './providers';

const ISBN = '9788924183429';
const PUB_DATE = new Date('2025-11-17T00:00:00.000Z');

// 각 provider가 실제로 주는 필드만 담는다(주지 않는 필드는 키가 없다).
const kakaoPatch: BookMetadataPatch = {
  title: '트렌드 코리아2026',
  authors: ['고종문'],
  translators: [],
  publisher: '퍼플',
  pubDate: PUB_DATE,
  thumbnail: 'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=x',
  coverImage: 'https://t1.daumcdn.net/lbook/image/7093237',
};

const nlPatch: BookMetadataPatch = {
  title: '트렌드 코리아2026',
  subTitle: 'NL 부제',
  authors: ['고종문'],
  translators: [],
  publisher: 'NL 쪽 출판사 표기',
  pubDate: PUB_DATE,
  thumbnail: null,
  coverImage: null,
  totalPage: 393,
};

const yes24Patch: BookMetadataPatch = {
  totalPage: 400,
  url: 'https://www.yes24.com/product/goods/153064968',
};

/** 카카오를 기본으로 NL이 부제·쪽수를 보충한 결과(YES24 없음). */
const kakaoWithNl: BookLookupResDto = {
  isbn: ISBN,
  title: '트렌드 코리아2026',
  subTitle: 'NL 부제',
  authors: ['고종문'],
  translators: [],
  publisher: '퍼플',
  pubDate: PUB_DATE,
  thumbnail: kakaoPatch.thumbnail!,
  coverImage: kakaoPatch.coverImage!,
  url: null,
  totalPage: 393,
};

/** NL 단독 결과(카카오 404, YES24 없음). */
const nlOnly: BookLookupResDto = {
  isbn: ISBN,
  title: '트렌드 코리아2026',
  subTitle: 'NL 부제',
  authors: ['고종문'],
  translators: [],
  publisher: 'NL 쪽 출판사 표기',
  pubDate: PUB_DATE,
  thumbnail: null,
  coverImage: null,
  url: null,
  totalPage: 393,
};

describe('BookLookupService', () => {
  let service: BookLookupService;
  let kakao: { source: 'kakao'; getByIsbn: jest.Mock };
  let nl: { source: 'nl'; getByIsbn: jest.Mock };
  let yes24: { source: 'yes24'; getByIsbn: jest.Mock };

  beforeEach(async () => {
    kakao = { source: 'kakao', getByIsbn: jest.fn() };
    nl = { source: 'nl', getByIsbn: jest.fn() };
    // 기본은 YES24에 없는 책으로 두고, YES24 동작은 아래 describe에서 따로 본다.
    yes24 = {
      source: 'yes24',
      getByIsbn: jest.fn().mockRejectedValue(new NotFoundException()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookLookupService,
        { provide: KakaoBookSearchService, useValue: kakao },
        { provide: NlBookSearchService, useValue: nl },
        { provide: Yes24BookSearchService, useValue: yes24 },
      ],
    }).compile();

    service = module.get(BookLookupService);
  });

  it('카카오를 기본으로 두고 NL에서 페이지 수/부제만 보충한다', async () => {
    kakao.getByIsbn.mockResolvedValue(kakaoPatch);
    nl.getByIsbn.mockResolvedValue(nlPatch);

    const result = await service.getByIsbn(ISBN);

    expect(result).toEqual(kakaoWithNl);
    // 표지/출판사 등 카카오에 값이 있는 필드는 카카오 값을 유지한다.
    expect(result.publisher).toBe('퍼플');
    expect(result.coverImage).toBe(kakaoPatch.coverImage);
  });

  it('세 API를 동시에 호출한다', async () => {
    let resolveKakao: (value: BookMetadataPatch) => void = () => undefined;
    kakao.getByIsbn.mockReturnValue(
      new Promise((resolve) => {
        resolveKakao = resolve;
      }),
    );
    nl.getByIsbn.mockResolvedValue(nlPatch);

    const pending = service.getByIsbn(ISBN);

    // 카카오 응답을 기다리는 동안 NL/YES24도 이미 호출되어 있어야 한다.
    expect(nl.getByIsbn).toHaveBeenCalledWith(ISBN);
    expect(yes24.getByIsbn).toHaveBeenCalledWith(ISBN);
    resolveKakao(kakaoPatch);
    await pending;
  });

  it.each([
    ['책 없음(404)', new NotFoundException()],
    ['장애(502)', new BadGatewayException()],
  ])('NL이 실패해도(%s) 카카오 결과로 등록을 계속한다', async (_, error) => {
    kakao.getByIsbn.mockResolvedValue(kakaoPatch);
    nl.getByIsbn.mockRejectedValue(error);

    await expect(service.getByIsbn(ISBN)).resolves.toEqual({
      ...kakaoWithNl,
      subTitle: null,
      totalPage: null,
    });
  });

  it('카카오에 없는 책(전자책 등)은 NL 단독으로 만든다', async () => {
    kakao.getByIsbn.mockRejectedValue(new NotFoundException());
    nl.getByIsbn.mockResolvedValue(nlPatch);

    await expect(service.getByIsbn(ISBN)).resolves.toEqual(nlOnly);
  });

  it('카카오 장애는 NL로 대신하지 않고 그대로 실패시킨다(표지 없는 Book이 영구히 남지 않도록)', async () => {
    const error = new BadGatewayException('카카오 도서 검색에 실패했습니다.');
    kakao.getByIsbn.mockRejectedValue(error);
    nl.getByIsbn.mockResolvedValue(nlPatch);

    await expect(service.getByIsbn(ISBN)).rejects.toBe(error);
  });

  it.each([
    ['NL도 없음', new NotFoundException()],
    ['NL은 장애', new BadGatewayException()],
  ])(
    '카카오에 없고 NL로도 만들 수 없으면 NotFoundException을 던진다 (%s)',
    async (_, nlError) => {
      kakao.getByIsbn.mockRejectedValue(new NotFoundException());
      nl.getByIsbn.mockRejectedValue(nlError);

      await expect(service.getByIsbn(ISBN)).rejects.toThrow(NotFoundException);
    },
  );

  describe('필드 단위 폴백', () => {
    it('카카오가 비운 필드(출판사)는 NL 값으로 채운다', async () => {
      kakao.getByIsbn.mockResolvedValue({ ...kakaoPatch, publisher: null });
      nl.getByIsbn.mockResolvedValue(nlPatch);

      const result = await service.getByIsbn(ISBN);

      expect(result.publisher).toBe('NL 쪽 출판사 표기');
      // 제목은 카카오가 찾았으므로 카카오 값이다.
      expect(result.title).toBe(kakaoPatch.title);
    });

    it('카카오 저자가 빈 배열이면 NL 저자를 쓴다', async () => {
      kakao.getByIsbn.mockResolvedValue({ ...kakaoPatch, authors: [] });
      nl.getByIsbn.mockResolvedValue({ ...nlPatch, authors: ['NL 저자'] });

      const result = await service.getByIsbn(ISBN);

      expect(result.authors).toEqual(['NL 저자']);
    });
  });

  describe('YES24 보충', () => {
    beforeEach(() => {
      kakao.getByIsbn.mockResolvedValue(kakaoPatch);
      nl.getByIsbn.mockResolvedValue(nlPatch);
    });

    it('페이지 수는 YES24를 NL보다 먼저 쓰고, 상품 링크를 url로 담는다', async () => {
      yes24.getByIsbn.mockResolvedValue(yes24Patch);

      await expect(service.getByIsbn(ISBN)).resolves.toEqual({
        ...kakaoWithNl,
        totalPage: 400,
        url: 'https://www.yes24.com/product/goods/153064968',
      });
    });

    it('YES24에 페이지 수가 없으면 NL 값을 쓰되 링크는 담는다', async () => {
      yes24.getByIsbn.mockResolvedValue({ ...yes24Patch, totalPage: null });

      const result = await service.getByIsbn(ISBN);

      expect(result.totalPage).toBe(393);
      expect(result.url).toBe(yes24Patch.url);
    });

    it.each([
      ['책 없음(404)', new NotFoundException()],
      ['장애(502)', new BadGatewayException()],
    ])(
      'YES24가 실패해도(%s) NL 페이지 수로 등록을 계속한다',
      async (_, error) => {
        yes24.getByIsbn.mockRejectedValue(error);

        const result = await service.getByIsbn(ISBN);

        expect(result.totalPage).toBe(393);
        expect(result.url).toBeNull();
      },
    );

    it('카카오에 없어 NL 단독으로 만들 때도 YES24로 보충한다', async () => {
      kakao.getByIsbn.mockRejectedValue(new NotFoundException());
      yes24.getByIsbn.mockResolvedValue(yes24Patch);

      await expect(service.getByIsbn(ISBN)).resolves.toEqual({
        ...nlOnly,
        totalPage: 400,
        url: yes24Patch.url,
      });
    });

    it('YES24에만 있는 책은 YES24로 Book을 만들지 않고 NotFoundException을 던진다(약관: 별도 DB 구축 금지)', async () => {
      kakao.getByIsbn.mockRejectedValue(new NotFoundException());
      nl.getByIsbn.mockRejectedValue(new NotFoundException());
      yes24.getByIsbn.mockResolvedValue({ ...yes24Patch, title: 'YES24 제목' });

      await expect(service.getByIsbn(ISBN)).rejects.toThrow(NotFoundException);
    });

    it('YES24가 다른 필드를 보내도 정책에 없는 필드는 쓰지 않는다', async () => {
      yes24.getByIsbn.mockResolvedValue({
        ...yes24Patch,
        title: 'YES24 제목',
        coverImage: 'https://image.yes24.com/goods/1/XL',
      });

      const result = await service.getByIsbn(ISBN);

      expect(result.title).toBe(kakaoPatch.title);
      expect(result.coverImage).toBe(kakaoPatch.coverImage);
    });
  });
});
