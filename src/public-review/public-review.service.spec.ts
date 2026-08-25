import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicReviewService } from './public-review.service';
import { PrismaService } from '../prisma/prisma.service';
import { firstCallArg } from '../common/testing/test-helpers';

function fakeReviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    review: '좋았다',
    createdAt: new Date('2026-01-01'),
    myBook: {
      rating: 4,
      book: {
        title: '미움받을 용기',
        thumbnail: 'https://img/1.jpg',
        isbn: '9788996991342',
      },
      user: { id: 5, name: '홍길동', profile: null },
    },
    _count: { reviewLike: 0, reviewComment: 0 },
    reviewLike: [],
    ...overrides,
  };
}

describe('PublicReviewService', () => {
  let service: PublicReviewService;
  let prismaService: {
    myBookReview: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      myBookReview: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((arg: Promise<unknown>[]) => Promise.all(arg)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicReviewService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(PublicReviewService);
  });

  describe('where 조건', () => {
    it('isbn이 없으면 공개 여부만으로 필터링한다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([]);
      prismaService.myBookReview.count.mockResolvedValue(0);

      await service.findAll(1, undefined, { page: 1, limit: 10 });

      const args = firstCallArg(prismaService.myBookReview.findMany) as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({ isPublic: true });
    });

    it('isbn이 있으면 해당 책으로 필터링한다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([]);
      prismaService.myBookReview.count.mockResolvedValue(0);

      await service.findAll(1, '9788996991342', { page: 1, limit: 10 });

      const args = firstCallArg(prismaService.myBookReview.findMany) as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({
        isPublic: true,
        myBook: { book: { isbn: '9788996991342' } },
      });
    });
  });

  describe('isLiked 계산용 sentinel', () => {
    it('로그인한 유저면 select.reviewLike.where.userId가 본인 id다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([]);
      prismaService.myBookReview.count.mockResolvedValue(0);

      await service.findAll(7, undefined, { page: 1, limit: 10 });

      const args = firstCallArg(prismaService.myBookReview.findMany) as {
        select: { reviewLike: { where: { userId: number } } };
      };
      expect(args.select.reviewLike.where.userId).toBe(7);
    });

    it('비로그인이면 어떤 유저와도 매치되지 않는 sentinel(0)을 사용한다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([]);
      prismaService.myBookReview.count.mockResolvedValue(0);

      await service.findAll(undefined, undefined, { page: 1, limit: 10 });

      const args = firstCallArg(prismaService.myBookReview.findMany) as {
        select: { reviewLike: { where: { userId: number } } };
      };
      expect(args.select.reviewLike.where.userId).toBe(0);
    });
  });

  describe('findOne (공개 리뷰 단건)', () => {
    it('공개 리뷰만 조회하며 소유권 조건은 걸지 않는다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(fakeReviewRow());

      await service.findOne(7, 42);

      const args = firstCallArg(prismaService.myBookReview.findFirst) as {
        where: Record<string, unknown>;
      };
      // 남의 공개 리뷰도 볼 수 있어야 하므로 userId 스코프가 없어야 한다.
      expect(args.where).toEqual({ id: 42, isPublic: true });
    });

    it('비공개 리뷰는 소유자여도 조회되지 않는다 (NotFoundException)', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(null);

      await expect(service.findOne(7, 42)).rejects.toThrow(NotFoundException);
    });

    it('비로그인이면 isLiked 계산에 sentinel(0)을 사용한다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(fakeReviewRow());

      await service.findOne(undefined, 42);

      const args = firstCallArg(prismaService.myBookReview.findFirst) as {
        select: { reviewLike: { where: { userId: number } } };
      };
      expect(args.select.reviewLike.where.userId).toBe(0);
    });

    it('목록과 동일하게 author/isLiked로 매핑하고 내부 식별자를 노출하지 않는다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(
        fakeReviewRow({ reviewLike: [{ id: 99 }] }),
      );

      const result = await service.findOne(7, 42);

      expect(result.author).toEqual({ id: 5, name: '홍길동', profile: null });
      expect(result.isLiked).toBe(true);
      expect(result).not.toHaveProperty('myBook');
      expect(result).not.toHaveProperty('reviewLike');
      expect(result).not.toHaveProperty('myBookId');
      expect(result).not.toHaveProperty('isPublic');
    });
  });

  // isPublic은 "내 감상(한줄평 + 평점) 공개"를 뜻하므로 rating은 함께 노출하되,
  // 개인 기록에 해당하는 진도/독서 로그는 이 플래그로 공개되지 않아야 한다.
  describe('평점 노출', () => {
    it('rating을 최상위로 끌어올려 노출한다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([fakeReviewRow()]);
      prismaService.myBookReview.count.mockResolvedValue(1);

      const result = await service.findAll(1, undefined, {
        page: 1,
        limit: 10,
      });

      expect(result.items[0].rating).toBe(4);
    });

    it('myBook에서 공개 대상 필드만 select한다 (진도/로그는 제외)', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([]);
      prismaService.myBookReview.count.mockResolvedValue(0);

      await service.findAll(1, undefined, { page: 1, limit: 10 });

      const args = firstCallArg(prismaService.myBookReview.findMany) as {
        select: { myBook: { select: Record<string, unknown> } };
      };
      expect(Object.keys(args.select.myBook.select).sort()).toEqual([
        'book',
        'rating',
        'user',
      ]);
      expect(args.select.myBook.select).not.toHaveProperty('currentPage');
      expect(args.select.myBook.select).not.toHaveProperty('readingLog');
    });

    it('단건 조회도 동일하게 rating을 노출한다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(fakeReviewRow());

      const result = await service.findOne(1, 42);

      expect(result.rating).toBe(4);
    });
  });

  // 피드에는 여러 책이 섞이므로 카드마다 어떤 책인지 보여줘야 한다.
  describe('책 정보 노출', () => {
    it('book을 최상위로 끌어올려 제목/썸네일/isbn을 노출한다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([fakeReviewRow()]);
      prismaService.myBookReview.count.mockResolvedValue(1);

      const result = await service.findAll(1, undefined, {
        page: 1,
        limit: 10,
      });

      expect(result.items[0].book).toEqual({
        title: '미움받을 용기',
        thumbnail: 'https://img/1.jpg',
        isbn: '9788996991342',
      });
    });

    it('내부 Book.id는 노출하지 않는다 (책 상세는 isbn으로 키잉됨)', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([]);
      prismaService.myBookReview.count.mockResolvedValue(0);

      await service.findAll(1, undefined, { page: 1, limit: 10 });

      const args = firstCallArg(prismaService.myBookReview.findMany) as {
        select: { myBook: { select: { book: { select: object } } } };
      };
      expect(args.select.myBook.select.book.select).not.toHaveProperty('id');
    });

    it('단건 조회도 동일하게 book을 노출한다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(fakeReviewRow());

      const result = await service.findOne(1, 42);

      expect(result.book.title).toBe('미움받을 용기');
      expect(result.book.isbn).toBe('9788996991342');
    });
  });

  describe('응답 매핑', () => {
    it('myBook.user를 author로, reviewLike 존재 여부를 isLiked로 매핑한다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([
        fakeReviewRow({ reviewLike: [{ id: 99 }] }),
        fakeReviewRow({ id: 2, reviewLike: [] }),
      ]);
      prismaService.myBookReview.count.mockResolvedValue(2);

      const result = await service.findAll(1, undefined, {
        page: 1,
        limit: 10,
      });

      expect(result.items[0].isLiked).toBe(true);
      expect(result.items[0].author).toEqual({
        id: 5,
        name: '홍길동',
        profile: null,
      });
      expect(result.items[0]).not.toHaveProperty('myBook');
      expect(result.items[0]).not.toHaveProperty('reviewLike');
      expect(result.items[1].isLiked).toBe(false);
    });
  });
});
