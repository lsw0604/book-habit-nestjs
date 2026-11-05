import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { BookLookupService } from './book-lookup.service';
import { BookLookupResDto } from './dto/book-lookup-res.dto';
import {
  type BookMetadataPatch,
  KakaoBookSearchService,
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

const yes24Patch: BookMetadataPatch = {
  totalPage: 400,
  url: 'https://www.yes24.com/product/goods/153064968',
};

/** 카카오 단독 결과(YES24 없음). */
const kakaoOnly: BookLookupResDto = {
  isbn: ISBN,
  title: '트렌드 코리아2026',
  authors: ['고종문'],
  translators: [],
  publisher: '퍼플',
  pubDate: PUB_DATE,
  thumbnail: kakaoPatch.thumbnail!,
  coverImage: kakaoPatch.coverImage!,
  url: null,
  totalPage: null,
};

describe('BookLookupService', () => {
  let service: BookLookupService;
  let kakao: { source: 'kakao'; getByIsbn: jest.Mock };
  let yes24: { source: 'yes24'; getByIsbn: jest.Mock };

  beforeEach(async () => {
    kakao = { source: 'kakao', getByIsbn: jest.fn() };
    // 기본은 YES24에 없는 책으로 두고, YES24 동작은 아래 describe에서 따로 본다.
    yes24 = {
      source: 'yes24',
      getByIsbn: jest.fn().mockRejectedValue(new NotFoundException()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookLookupService,
        { provide: KakaoBookSearchService, useValue: kakao },
        { provide: Yes24BookSearchService, useValue: yes24 },
      ],
    }).compile();

    service = module.get(BookLookupService);
  });

  it('카카오 결과로 Book 모양을 만든다', async () => {
    kakao.getByIsbn.mockResolvedValue(kakaoPatch);

    await expect(service.getByIsbn(ISBN)).resolves.toEqual(kakaoOnly);
  });

  it('카카오와 YES24를 동시에 호출한다', async () => {
    let resolveKakao: (value: BookMetadataPatch) => void = () => undefined;
    kakao.getByIsbn.mockReturnValue(
      new Promise((resolve) => {
        resolveKakao = resolve;
      }),
    );

    const pending = service.getByIsbn(ISBN);

    // 카카오 응답을 기다리는 동안 YES24도 이미 호출되어 있어야 한다.
    expect(yes24.getByIsbn).toHaveBeenCalledWith(ISBN);
    resolveKakao(kakaoPatch);
    await pending;
  });

  it('카카오에 없는 책은 NotFoundException을 던진다(대체 출처가 없다)', async () => {
    kakao.getByIsbn.mockRejectedValue(new NotFoundException());

    await expect(service.getByIsbn(ISBN)).rejects.toThrow(NotFoundException);
  });

  it('카카오 장애는 그대로 실패시킨다(부족한 Book이 영구히 남지 않도록)', async () => {
    const error = new BadGatewayException('카카오 도서 검색에 실패했습니다.');
    kakao.getByIsbn.mockRejectedValue(error);
    yes24.getByIsbn.mockResolvedValue(yes24Patch);

    await expect(service.getByIsbn(ISBN)).rejects.toBe(error);
  });

  describe('YES24 보충', () => {
    beforeEach(() => {
      kakao.getByIsbn.mockResolvedValue(kakaoPatch);
    });

    it('페이지 수와 상품 링크를 YES24에서 채운다', async () => {
      yes24.getByIsbn.mockResolvedValue(yes24Patch);

      await expect(service.getByIsbn(ISBN)).resolves.toEqual({
        ...kakaoOnly,
        totalPage: 400,
        url: 'https://www.yes24.com/product/goods/153064968',
      });
    });

    it.each([
      ['책 없음(404)', new NotFoundException()],
      ['장애(502)', new BadGatewayException()],
    ])(
      'YES24가 실패해도(%s) 쪽수·링크 없이 등록을 계속한다',
      async (_, error) => {
        yes24.getByIsbn.mockRejectedValue(error);

        const result = await service.getByIsbn(ISBN);

        expect(result.totalPage).toBeNull();
        expect(result.url).toBeNull();
      },
    );

    it('YES24에만 있는 책은 YES24로 Book을 만들지 않고 NotFoundException을 던진다(저장 승인 범위: 쪽수·링크)', async () => {
      kakao.getByIsbn.mockRejectedValue(new NotFoundException());
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
