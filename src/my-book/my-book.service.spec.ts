import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MyBookStatus, Prisma } from '@prisma/client';
import { MyBookService } from './my-book.service';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from '../books/books.service';
import {
  callData,
  callWhere,
  createPrismaError,
  firstCallArg,
} from '../common/testing/test-helpers';

type MockPrismaService = {
  myBook: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  readingLog: {
    findFirst: jest.Mock;
  };
  $transaction: jest.Mock;
};

function updateCallData(mockFn: jest.Mock): Prisma.MyBookUpdateInput {
  return callData<Prisma.MyBookUpdateInput>(mockFn);
}

function createCallData(mockFn: jest.Mock): Prisma.MyBookCreateInput {
  return callData<Prisma.MyBookCreateInput>(mockFn);
}

function fakeMyBookDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: MyBookStatus.WANT_TO_READ,
    startedAt: null,
    finishedAt: null,
    rating: null,
    currentPage: 0,
    readCount: 0,
    book: { totalPage: 300 },
    review: null,
    _count: { readingLog: 0 },
    ...overrides,
  };
}

describe('MyBookService', () => {
  let service: MyBookService;
  let prismaService: MockPrismaService;
  let booksService: { findOrCreate: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      myBook: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      readingLog: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((arg: Promise<unknown>[]) => Promise.all(arg)),
    };
    booksService = { findOrCreate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyBookService,
        { provide: PrismaService, useValue: prismaService },
        { provide: BooksService, useValue: booksService },
      ],
    }).compile();

    service = module.get(MyBookService);
  });

  // MyBook은 userId 직접 컬럼을 가지므로 조회/변이 모두 userId로 스코프되어야 한다.
  // 이 조건이 빠지면 남의 서재 항목에 접근할 수 있고, assertOwnership은
  // ReadingLog/MyBookReview/MyBookTag가 공유하는 단일 진실 공급원이라 파급이 크다.
  describe('소유권 스코프 (where 절)', () => {
    it('assertOwnership은 id와 userId를 함께 걸어 조회한다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue({
        book: { totalPage: 300 },
      });

      await service.assertOwnership(7, 42);

      expect(callWhere(prismaService.myBook.findFirst)).toEqual({
        id: 42,
        userId: 7,
      });
    });

    it('findOne은 id와 userId를 함께 걸어 조회한다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(fakeMyBookDetail());

      await service.findOne(7, 42);

      expect(callWhere(prismaService.myBook.findFirst)).toEqual({
        id: 42,
        userId: 7,
      });
    });

    it('findOne은 소유하지 않은 항목이면 NotFoundException을 던진다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(null);

      await expect(service.findOne(7, 42)).rejects.toThrow(NotFoundException);
    });

    it('update는 선행 조회와 실제 update 양쪽 모두 userId로 스코프한다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(fakeMyBookDetail());
      prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

      await service.update(7, 42, { rating: 4 });

      expect(callWhere(prismaService.myBook.findFirst)).toEqual({
        id: 42,
        userId: 7,
      });
      expect(callWhere(prismaService.myBook.update)).toEqual({
        id: 42,
        userId: 7,
      });
    });

    it('remove는 userId로 스코프해 삭제한다', async () => {
      prismaService.myBook.delete.mockResolvedValue(fakeMyBookDetail());

      await service.remove(7, 42);

      expect(callWhere(prismaService.myBook.delete)).toEqual({
        id: 42,
        userId: 7,
      });
    });
  });

  describe('update - 상태 전이', () => {
    it('WANT_TO_READ -> CURRENTLY_READING: startedAt이 없으면 now로 채운다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(
        fakeMyBookDetail({
          status: MyBookStatus.WANT_TO_READ,
          startedAt: null,
        }),
      );
      prismaService.myBook.update.mockResolvedValue(
        fakeMyBookDetail({ status: MyBookStatus.CURRENTLY_READING }),
      );

      await service.update(1, 1, { status: MyBookStatus.CURRENTLY_READING });

      const data = updateCallData(prismaService.myBook.update);
      expect(data.status).toBe(MyBookStatus.CURRENTLY_READING);
      expect(data.startedAt).toBeInstanceOf(Date);
    });

    it('WANT_TO_READ -> CURRENTLY_READING: startedAt이 이미 있으면 유지한다', async () => {
      const originalStartedAt = new Date('2026-01-01');
      prismaService.myBook.findFirst.mockResolvedValue(
        fakeMyBookDetail({
          status: MyBookStatus.WANT_TO_READ,
          startedAt: originalStartedAt,
        }),
      );
      prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

      await service.update(1, 1, { status: MyBookStatus.CURRENTLY_READING });

      const data = updateCallData(prismaService.myBook.update);
      expect(data.startedAt).toBe(originalStartedAt);
    });

    it.each([MyBookStatus.WANT_TO_READ, MyBookStatus.CURRENTLY_READING])(
      '%s -> READ: finishedAt을 채우고 readCount를 1 증가시킨다',
      async (current) => {
        prismaService.myBook.findFirst.mockResolvedValue(
          fakeMyBookDetail({ status: current }),
        );
        prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

        await service.update(1, 1, { status: MyBookStatus.READ });

        const data = updateCallData(prismaService.myBook.update);
        expect(data.status).toBe(MyBookStatus.READ);
        expect(data.finishedAt).toBeInstanceOf(Date);
        expect(data.readCount).toEqual({ increment: 1 });
      },
    );

    it('CURRENTLY_READING -> WANT_TO_READ: status만 변경하고 다른 필드는 건드리지 않는다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(
        fakeMyBookDetail({ status: MyBookStatus.CURRENTLY_READING }),
      );
      prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

      await service.update(1, 1, { status: MyBookStatus.WANT_TO_READ });

      const data = updateCallData(prismaService.myBook.update);
      expect(data).toEqual({ status: MyBookStatus.WANT_TO_READ });
    });

    it.each([MyBookStatus.WANT_TO_READ, MyBookStatus.CURRENTLY_READING])(
      'READ -> %s: 재독 시 readCount를 건드리지 않고 status만 변경한다',
      async (nextStatus) => {
        prismaService.myBook.findFirst.mockResolvedValue(
          fakeMyBookDetail({ status: MyBookStatus.READ }),
        );
        prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

        await service.update(1, 1, { status: nextStatus });

        const data = updateCallData(prismaService.myBook.update);
        expect(data).toEqual({ status: nextStatus });
      },
    );

    it('nextStatus가 없으면 status 관련 필드를 patch에 포함하지 않는다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(
        fakeMyBookDetail({ status: MyBookStatus.CURRENTLY_READING }),
      );
      prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

      await service.update(1, 1, { rating: 4 });

      const data = updateCallData(prismaService.myBook.update);
      expect(data).not.toHaveProperty('status');
      expect(data.rating).toBe(4);
    });

    it('nextStatus가 현재 status와 같으면 아무것도 변경하지 않는다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(
        fakeMyBookDetail({ status: MyBookStatus.WANT_TO_READ }),
      );
      prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

      await service.update(1, 1, { status: MyBookStatus.WANT_TO_READ });

      const data = updateCallData(prismaService.myBook.update);
      expect(data).not.toHaveProperty('status');
    });
  });

  describe('update - 유효성 검증', () => {
    it('currentPage가 totalPage를 초과하면 BadRequestException을 던지고 update를 호출하지 않는다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(
        fakeMyBookDetail({ book: { totalPage: 100 } }),
      );

      await expect(service.update(1, 1, { currentPage: 101 })).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.myBook.update).not.toHaveBeenCalled();
    });

    it('대상 MyBook이 없으면 NotFoundException을 던진다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(null);

      await expect(service.update(1, 999, {})).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.myBook.update).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('status를 지정하지 않으면 WANT_TO_READ로 생성한다', async () => {
      booksService.findOrCreate.mockResolvedValue({ id: 10 });
      prismaService.myBook.create.mockResolvedValue(fakeMyBookDetail());

      await service.create(1, { isbn: '9788996991342' });

      const data = createCallData(prismaService.myBook.create);
      expect(data.status).toBe(MyBookStatus.WANT_TO_READ);
      expect(data.startedAt).toBeUndefined();
      expect(data.finishedAt).toBeUndefined();
    });

    it('status를 CURRENTLY_READING으로 지정하면 startedAt만 채운다', async () => {
      booksService.findOrCreate.mockResolvedValue({ id: 10 });
      prismaService.myBook.create.mockResolvedValue(fakeMyBookDetail());

      await service.create(1, {
        isbn: '9788996991342',
        status: MyBookStatus.CURRENTLY_READING,
      });

      const data = createCallData(prismaService.myBook.create);
      expect(data.status).toBe(MyBookStatus.CURRENTLY_READING);
      expect(data.startedAt).toBeInstanceOf(Date);
      expect(data.finishedAt).toBeUndefined();
      expect(data.readCount).toBeUndefined();
    });

    it('status를 READ로 지정하면 finishedAt과 readCount 1을 채운다', async () => {
      booksService.findOrCreate.mockResolvedValue({ id: 10 });
      prismaService.myBook.create.mockResolvedValue(fakeMyBookDetail());

      await service.create(1, {
        isbn: '9788996991342',
        status: MyBookStatus.READ,
      });

      const data = createCallData(prismaService.myBook.create);
      expect(data.status).toBe(MyBookStatus.READ);
      expect(data.finishedAt).toBeInstanceOf(Date);
      expect(data.readCount).toBe(1);
      // 읽음으로 바로 등록하는 경로라 시작 시각은 알 수 없으므로 채우지 않는다.
      expect(data.startedAt).toBeUndefined();
    });

    it('같은 책을 중복 등록하면 ConflictException을 던진다', async () => {
      booksService.findOrCreate.mockResolvedValue({ id: 10 });
      prismaService.myBook.create.mockRejectedValue(
        createPrismaError('P2002', { target: ['userId', 'bookId'] }),
      );

      await expect(
        service.create(1, { isbn: '9788996991342' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const options = { page: 1, limit: 10, order: 'desc' as const };

    function mockList(items: unknown[] = [], totalCount = 0) {
      prismaService.myBook.findMany.mockResolvedValue(items);
      prismaService.myBook.count.mockResolvedValue(totalCount);
    }

    it('필터가 없으면 userId로만 스코프한다', async () => {
      mockList();

      await service.findAll(7, undefined, options);

      expect(callWhere(prismaService.myBook.findMany)).toEqual({ userId: 7 });
    });

    it('status를 지정하면 함께 필터링한다', async () => {
      mockList();

      await service.findAll(7, MyBookStatus.READ, options);

      expect(callWhere(prismaService.myBook.findMany)).toEqual({
        userId: 7,
        status: MyBookStatus.READ,
      });
    });

    it('minRating을 지정하면 gte로 필터링한다', async () => {
      mockList();

      await service.findAll(7, undefined, { ...options, minRating: 4 });

      expect(callWhere(prismaService.myBook.findMany)).toEqual({
        userId: 7,
        rating: { gte: 4 },
      });
    });

    it('minRating이 0이어도 필터가 적용된다 (falsy 값 함정)', async () => {
      mockList();

      await service.findAll(7, undefined, { ...options, minRating: 0 });

      expect(callWhere(prismaService.myBook.findMany)).toEqual({
        userId: 7,
        rating: { gte: 0 },
      });
    });

    it('hasReview: true면 리뷰가 있는 항목만 조회한다', async () => {
      mockList();

      await service.findAll(7, undefined, { ...options, hasReview: true });

      expect(callWhere(prismaService.myBook.findMany)).toEqual({
        userId: 7,
        review: { isNot: null },
      });
    });

    it('hasReview: false면 리뷰가 없는 항목만 조회한다 (undefined와 구분)', async () => {
      mockList();

      await service.findAll(7, undefined, { ...options, hasReview: false });

      expect(callWhere(prismaService.myBook.findMany)).toEqual({
        userId: 7,
        review: { is: null },
      });
    });

    // 정렬 방향과 무관하게 한 번도 안 읽은 책(lastReadAt: null)은 항상 뒤로 보낸다.
    // asc로 뒤집는다고 "안 읽은 책 먼저"가 되면 안 된다는 것이 이 규칙의 핵심.
    it.each(['asc', 'desc'] as const)(
      'order가 %s여도 lastReadAt이 null인 항목은 항상 뒤로 정렬한다',
      async (order) => {
        mockList();

        await service.findAll(7, undefined, { ...options, order });

        const args = firstCallArg(prismaService.myBook.findMany) as {
          orderBy: unknown;
        };
        expect(args.orderBy).toEqual([
          { lastReadAt: { sort: order, nulls: 'last' } },
          { createdAt: order },
        ]);
      },
    );

    it('페이지네이션 skip/take와 meta를 함께 계산한다', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      mockList(items, 25);

      const result = await service.findAll(7, undefined, {
        page: 2,
        limit: 10,
        order: 'desc',
      });

      const args = firstCallArg(prismaService.myBook.findMany) as {
        skip: number;
        take: number;
      };
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(result.items).toBe(items);
      expect(result.meta.totalCount).toBe(25);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('count에도 findMany와 동일한 where를 사용한다', async () => {
      mockList();

      await service.findAll(7, MyBookStatus.READ, options);

      expect(callWhere(prismaService.myBook.count)).toEqual(
        callWhere(prismaService.myBook.findMany),
      );
    });
  });

  describe('assertOwnership', () => {
    it('소유하지 않은/존재하지 않는 MyBook이면 NotFoundException을 던진다', async () => {
      prismaService.myBook.findFirst.mockResolvedValue(null);

      await expect(service.assertOwnership(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('소유한 MyBook이면 그대로 반환한다', async () => {
      const myBook = { book: { totalPage: 300 } };
      prismaService.myBook.findFirst.mockResolvedValue(myBook);

      await expect(service.assertOwnership(1, 1)).resolves.toBe(myBook);
    });
  });

  describe('remove', () => {
    it('대상이 없으면(P2025) NotFoundException을 던진다', async () => {
      prismaService.myBook.delete.mockRejectedValue(createPrismaError('P2025'));

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('정상적으로 삭제한다', async () => {
      prismaService.myBook.delete.mockResolvedValue(fakeMyBookDetail());

      await service.remove(1, 1);

      expect(prismaService.myBook.delete).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
    });
  });

  describe('startReadingIfWantToRead', () => {
    it('WANT_TO_READ면 CURRENTLY_READING으로 승격하고 startedAt이 없으면 채운다', async () => {
      prismaService.myBook.findUnique.mockResolvedValue({
        status: MyBookStatus.WANT_TO_READ,
        startedAt: null,
      });

      await service.startReadingIfWantToRead(1);

      const data = updateCallData(prismaService.myBook.update);
      expect(data.status).toBe(MyBookStatus.CURRENTLY_READING);
      expect(data.startedAt).toBeInstanceOf(Date);
    });

    it('WANT_TO_READ가 아니면 아무것도 하지 않는다', async () => {
      prismaService.myBook.findUnique.mockResolvedValue({
        status: MyBookStatus.CURRENTLY_READING,
        startedAt: new Date(),
      });

      await service.startReadingIfWantToRead(1);

      expect(prismaService.myBook.update).not.toHaveBeenCalled();
    });

    it('MyBook이 존재하지 않으면 아무것도 하지 않는다', async () => {
      prismaService.myBook.findUnique.mockResolvedValue(null);

      await service.startReadingIfWantToRead(1);

      expect(prismaService.myBook.update).not.toHaveBeenCalled();
    });
  });

  describe('syncProgressFromLatestReadingLog', () => {
    it('최신 ReadingLog가 있으면 그 endPage/endTime으로 동기화한다', async () => {
      const endTime = new Date('2026-01-02');
      prismaService.readingLog.findFirst.mockResolvedValue({
        endPage: 150,
        endTime,
      });
      prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

      await service.syncProgressFromLatestReadingLog(1);

      const data = updateCallData(prismaService.myBook.update);
      expect(data.currentPage).toBe(150);
      expect(data.lastReadAt).toBe(endTime);
    });

    it('ReadingLog가 하나도 없으면 초기값(0/null)으로 되돌린다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue(null);
      prismaService.myBook.update.mockResolvedValue(fakeMyBookDetail());

      await service.syncProgressFromLatestReadingLog(1);

      const data = updateCallData(prismaService.myBook.update);
      expect(data.currentPage).toBe(0);
      expect(data.lastReadAt).toBeNull();
    });
  });
});
