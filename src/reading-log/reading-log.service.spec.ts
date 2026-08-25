import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReadingLogService } from './reading-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import { CreateReadingLogDto } from './dto/create-reading-log.dto';

function firstCallArg(mockFn: jest.Mock): unknown {
  const calls = mockFn.mock.calls as unknown[][];
  const [firstCall] = calls;
  const [arg] = firstCall;
  return arg;
}

function baseCreateDto(
  overrides: Partial<CreateReadingLogDto> = {},
): CreateReadingLogDto {
  return {
    myBookId: 1,
    startPage: 10,
    endPage: 20,
    startTime: new Date('2026-01-01T10:00:00'),
    endTime: new Date('2026-01-01T11:00:00'),
    readingMinutes: 60,
    date: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('ReadingLogService', () => {
  let service: ReadingLogService;
  let prismaService: {
    myBook: { findUniqueOrThrow: jest.Mock };
    readingLog: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockTx: {
    readingLog: { create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  };
  let myBookService: {
    assertOwnership: jest.Mock;
    startReadingIfWantToRead: jest.Mock;
    syncProgressFromLatestReadingLog: jest.Mock;
  };

  beforeEach(async () => {
    mockTx = {
      readingLog: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    prismaService = {
      myBook: { findUniqueOrThrow: jest.fn() },
      readingLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(mockTx);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    myBookService = {
      assertOwnership: jest.fn(),
      startReadingIfWantToRead: jest.fn(),
      syncProgressFromLatestReadingLog: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingLogService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MyBookService, useValue: myBookService },
      ],
    }).compile();

    service = module.get(ReadingLogService);
  });

  describe('create - 검증', () => {
    it('endPage가 startPage보다 작으면 BadRequestException을 던진다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      const dto = baseCreateDto({ startPage: 50, endPage: 10 });

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('endPage가 book.totalPage를 초과하면 BadRequestException을 던진다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 100 },
      });
      const dto = baseCreateDto({ endPage: 101 });

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('endTime이 startTime보다 빠르면 BadRequestException을 던진다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      const dto = baseCreateDto({
        startTime: new Date('2026-01-01T11:00:00'),
        endTime: new Date('2026-01-01T10:00:00'),
      });

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('book.totalPage가 null이면 endPage 상한 검증을 건너뛴다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: null },
      });
      mockTx.readingLog.create.mockResolvedValue({ id: 1 });
      const dto = baseCreateDto({ endPage: 99999 });

      await expect(service.create(1, dto)).resolves.toEqual({ id: 1 });
    });
  });

  describe('create - 트랜잭션 orchestration', () => {
    it('ReadingLog 생성 후 같은 tx로 상태 승격과 진행률 동기화를 호출한다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      mockTx.readingLog.create.mockResolvedValue({ id: 1 });
      const dto = baseCreateDto();

      await service.create(1, dto);

      expect(myBookService.assertOwnership).toHaveBeenCalledWith(
        1,
        dto.myBookId,
      );
      const createArgs = firstCallArg(mockTx.readingLog.create) as {
        data: CreateReadingLogDto;
      };
      expect(createArgs.data).toEqual(dto);
      expect(myBookService.startReadingIfWantToRead).toHaveBeenCalledWith(
        dto.myBookId,
        mockTx,
      );
      expect(
        myBookService.syncProgressFromLatestReadingLog,
      ).toHaveBeenCalledWith(dto.myBookId, mockTx);
    });
  });

  describe('findOne', () => {
    it('본인 소유가 아니거나 존재하지 않으면 NotFoundException을 던진다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('존재하면 그대로 반환한다', async () => {
      const log = { id: 1, myBookId: 1 };
      prismaService.readingLog.findFirst.mockResolvedValue(log);

      await expect(service.findOne(1, 1)).resolves.toBe(log);
    });
  });

  describe('update', () => {
    const existing = {
      id: 1,
      myBookId: 1,
      startPage: 10,
      endPage: 20,
      startTime: new Date('2026-01-01T10:00:00'),
      endTime: new Date('2026-01-01T11:00:00'),
    };

    it('일부 필드만 수정해도 기존 값과 합쳐서 정합성을 검증한다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue(existing);
      prismaService.myBook.findUniqueOrThrow.mockResolvedValue({
        book: { totalPage: 300 },
      });

      await expect(service.update(1, 1, { endPage: 5 })).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('정상 수정이면 tx로 update와 진행률 동기화를 호출한다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue(existing);
      prismaService.myBook.findUniqueOrThrow.mockResolvedValue({
        book: { totalPage: 300 },
      });
      mockTx.readingLog.update.mockResolvedValue({ ...existing, endPage: 30 });

      await service.update(1, 1, { endPage: 30 });

      const updateArgs = firstCallArg(mockTx.readingLog.update) as {
        where: { id: number };
        data: Record<string, unknown>;
      };
      expect(updateArgs.where).toEqual({ id: 1 });
      expect(updateArgs.data).toEqual({ endPage: 30 });
      expect(
        myBookService.syncProgressFromLatestReadingLog,
      ).toHaveBeenCalledWith(existing.myBookId, mockTx);
    });
  });

  describe('remove', () => {
    it('삭제 후 같은 tx로 진행률을 재동기화한다', async () => {
      const existing = { id: 1, myBookId: 1 };
      prismaService.readingLog.findFirst.mockResolvedValue(existing);

      await service.remove(1, 1);

      expect(mockTx.readingLog.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(
        myBookService.syncProgressFromLatestReadingLog,
      ).toHaveBeenCalledWith(existing.myBookId, mockTx);
    });

    it('존재하지 않으면 NotFoundException을 던지고 삭제를 시도하지 않는다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
      expect(mockTx.readingLog.delete).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('소유권을 확인하고 페이지네이션 메타를 함께 반환한다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      const items = [{ id: 1 }, { id: 2 }];
      prismaService.readingLog.findMany.mockResolvedValue(items);
      prismaService.readingLog.count.mockResolvedValue(2);

      const result = await service.findAll(1, 1, { page: 1, limit: 10 });

      expect(myBookService.assertOwnership).toHaveBeenCalledWith(1, 1);
      expect(result.items).toBe(items);
      expect(result.meta.totalCount).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});
