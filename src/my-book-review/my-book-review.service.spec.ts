import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MyBookReviewService } from './my-book-review.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import {
  callData,
  callWhere,
  createPrismaError,
} from '../common/testing/test-helpers';

function fakeListItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    myBookId: 1,
    review: '좋았다',
    isPublic: true,
    createdAt: new Date('2026-01-01'),
    myBook: { book: { title: '책 제목', thumbnail: null } },
    _count: { reviewLike: 0, reviewComment: 0 },
    ...overrides,
  };
}

describe('MyBookReviewService', () => {
  let service: MyBookReviewService;
  let prismaService: {
    myBookReview: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let myBookService: { assertOwnership: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      myBookReview: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(prismaService);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };
    myBookService = { assertOwnership: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyBookReviewService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MyBookService, useValue: myBookService },
      ],
    }).compile();

    service = module.get(MyBookReviewService);
  });

  describe('create', () => {
    it('소유권을 확인하고 좋아요/댓글 0으로 채워 반환한다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      prismaService.myBookReview.create.mockResolvedValue({
        id: 1,
        myBookId: 1,
        review: '좋았다',
        isPublic: true,
      });

      const result = await service.create(1, {
        myBookId: 1,
        review: '좋았다',
        isPublic: true,
      });

      expect(myBookService.assertOwnership).toHaveBeenCalledWith(1, 1);
      expect(result._count).toEqual({ reviewLike: 0, reviewComment: 0 });
    });

    it('이미 한줄평이 있으면(P2002) ConflictException을 던진다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      prismaService.myBookReview.create.mockRejectedValue(
        createPrismaError('P2002', { target: ['myBookId'] }),
      );

      await expect(
        service.create(1, { myBookId: 1, review: '좋았다', isPublic: true }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // accessibleOr는 "공개거나 본인 것" 규칙으로, 좋아요/댓글 작성 가능 여부를
  // 판정하는 assertAccessible에서만 쓰인다. findOne은 소유자 전용으로 분리되어
  // 더 이상 이 규칙을 쓰지 않는다 (남의 공개 리뷰 열람은 public-review 담당).
  describe('accessibleOr (assertAccessible을 통해 검증)', () => {
    it('로그인한 유저면 OR에 본인 소유 조건을 포함한다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue({ id: 1 });

      await service.assertAccessible(1, 1);

      const where = callWhere(prismaService.myBookReview.findFirst) as {
        OR: unknown[];
      };
      expect(where.OR).toEqual([{ isPublic: true }, { myBook: { userId: 1 } }]);
    });

    it('비로그인(userId undefined)이면 본인 소유 조건을 OR에서 완전히 제외한다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue({ id: 1 });

      await service.assertAccessible(undefined, 1);

      const where = callWhere(prismaService.myBookReview.findFirst) as {
        OR: unknown[];
      };
      expect(where.OR).toEqual([{ isPublic: true }]);
    });

    it('접근할 수 없으면 NotFoundException을 던진다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(null);

      await expect(service.assertAccessible(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne (소유자 전용)', () => {
    it('myBook.userId로만 스코프하고 공개 여부(OR)는 보지 않는다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue({ id: 42 });

      await service.findOne(7, 42);

      const where = callWhere(prismaService.myBookReview.findFirst);
      expect(where).toEqual({ id: 42, myBook: { userId: 7 } });
      // 남의 공개 리뷰까지 열리면 안 되므로 isPublic 분기가 없어야 한다.
      expect(where).not.toHaveProperty('OR');
    });

    it('남의 리뷰는 공개여도 NotFoundException을 던진다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(null);

      await expect(service.findOne(7, 999)).rejects.toThrow(NotFoundException);
    });

    it('본인 리뷰면 그대로 반환한다', async () => {
      const review = { id: 1, isPublic: false };
      prismaService.myBookReview.findFirst.mockResolvedValue(review);

      await expect(service.findOne(1, 1)).resolves.toBe(review);
    });
  });

  // MyBookReview는 userId 직접 컬럼이 없어 myBook 관계를 통해서만 소유권을 판별한다.
  // 이 관계 조건이 빠지면 남의 한줄평을 수정/삭제할 수 있다.
  describe('소유권 스코프 (where 절)', () => {
    it('update의 선행 소유권 확인은 myBook.userId를 통해 스코프한다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue({ id: 42 });
      prismaService.myBookReview.update.mockResolvedValue({ id: 42 });

      await service.update(7, 42, { review: '수정' });

      expect(callWhere(prismaService.myBookReview.findFirst)).toEqual({
        id: 42,
        myBook: { userId: 7 },
      });
    });

    it('remove는 myBook.userId를 통해 스코프해 삭제한다', async () => {
      prismaService.myBookReview.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove(7, 42);

      expect(callWhere(prismaService.myBookReview.deleteMany)).toEqual({
        id: 42,
        myBook: { userId: 7 },
      });
    });

    it('findAll은 요청자가 작성한 한줄평만 조회한다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([fakeListItem()]);
      prismaService.myBookReview.count.mockResolvedValue(1);

      const result = await service.findAll(7, { page: 1, limit: 10 });

      expect(callWhere(prismaService.myBookReview.findMany)).toEqual({
        myBook: { userId: 7 },
      });
      // 본인 글이라 isPublic 여부와 무관하게 포함되어야 하므로 OR 필터가 없어야 한다.
      expect(callWhere(prismaService.myBookReview.findMany)).not.toHaveProperty(
        'OR',
      );
      expect(result.items[0].book).toEqual({
        title: '책 제목',
        thumbnail: null,
      });
    });
  });

  describe('update', () => {
    it('본인 소유가 아니면 NotFoundException을 던지고 update를 호출하지 않는다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue(null);

      await expect(service.update(1, 1, { review: '수정' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.myBookReview.update).not.toHaveBeenCalled();
    });

    it('본인 소유면 수정한다', async () => {
      prismaService.myBookReview.findFirst.mockResolvedValue({ id: 1 });
      prismaService.myBookReview.update.mockResolvedValue({
        id: 1,
        review: '수정',
      });

      await service.update(1, 1, { review: '수정' });

      expect(callWhere(prismaService.myBookReview.update)).toEqual({ id: 1 });
      expect(callData(prismaService.myBookReview.update)).toEqual({
        review: '수정',
      });
    });
  });

  describe('remove', () => {
    it('삭제된 행이 없으면 NotFoundException을 던진다', async () => {
      prismaService.myBookReview.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('본인 소유면 삭제한다', async () => {
      prismaService.myBookReview.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.remove(1, 1)).resolves.toBeUndefined();
      expect(prismaService.myBookReview.deleteMany).toHaveBeenCalledWith({
        where: { id: 1, myBook: { userId: 1 } },
      });
    });
  });

  describe('findLiked / findCommented', () => {
    it('findLiked는 좋아요 필터와 접근 가능 조건을 함께 건다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([fakeListItem()]);
      prismaService.myBookReview.count.mockResolvedValue(1);

      await service.findLiked(1, { page: 1, limit: 10 });

      expect(callWhere(prismaService.myBookReview.findMany)).toEqual(
        expect.objectContaining({
          reviewLike: { some: { userId: 1 } },
          OR: [{ isPublic: true }, { myBook: { userId: 1 } }],
        }),
      );
    });

    it('findCommented는 댓글 필터와 접근 가능 조건을 함께 걸고 book으로 매핑한다', async () => {
      prismaService.myBookReview.findMany.mockResolvedValue([fakeListItem()]);
      prismaService.myBookReview.count.mockResolvedValue(1);

      const result = await service.findCommented(1, { page: 1, limit: 10 });

      expect(callWhere(prismaService.myBookReview.findMany)).toEqual(
        expect.objectContaining({
          reviewComment: { some: { userId: 1 } },
        }),
      );
      expect(result.items[0]).not.toHaveProperty('myBook');
      expect(result.items[0].book).toEqual({
        title: '책 제목',
        thumbnail: null,
      });
    });
  });
});
