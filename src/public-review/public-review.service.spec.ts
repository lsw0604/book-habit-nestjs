import { Test, TestingModule } from '@nestjs/testing';
import { PublicReviewService } from './public-review.service';
import { PrismaService } from '../prisma/prisma.service';

function firstCallArg(mockFn: jest.Mock): unknown {
  const calls = mockFn.mock.calls as unknown[][];
  const [firstCall] = calls;
  const [arg] = firstCall;
  return arg;
}

function fakeReviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    review: '좋았다',
    createdAt: new Date('2026-01-01'),
    myBook: { user: { id: 5, name: '홍길동', profile: null } },
    _count: { reviewLike: 0, reviewComment: 0 },
    reviewLike: [],
    ...overrides,
  };
}

describe('PublicReviewService', () => {
  let service: PublicReviewService;
  let prismaService: {
    myBookReview: { findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      myBookReview: { findMany: jest.fn(), count: jest.fn() },
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
