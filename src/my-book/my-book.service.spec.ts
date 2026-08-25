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

type MockPrismaService = {
  myBook: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  readingLog: {
    findFirst: jest.Mock;
  };
};

function createPrismaError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mock prisma error', {
    code,
    clientVersion: '6.12.0',
    meta,
  });
}

function firstCallArg(mockFn: jest.Mock): unknown {
  const calls = mockFn.mock.calls as unknown[][];
  const [firstCall] = calls;
  const [arg] = firstCall;
  return arg;
}

function updateCallData(mockFn: jest.Mock): Prisma.MyBookUpdateInput {
  return (firstCallArg(mockFn) as { data: Prisma.MyBookUpdateInput }).data;
}

function createCallData(mockFn: jest.Mock): Prisma.MyBookCreateInput {
  return (firstCallArg(mockFn) as { data: Prisma.MyBookCreateInput }).data;
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
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      readingLog: {
        findFirst: jest.fn(),
      },
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
