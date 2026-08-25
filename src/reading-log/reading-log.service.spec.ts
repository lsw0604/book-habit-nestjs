import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReadingLogService } from './reading-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import { CreateReadingLogDto } from './dto/create-reading-log.dto';
import { firstCallArg } from '../common/testing/test-helpers';

function baseCreateDto(
  overrides: Partial<CreateReadingLogDto> = {},
): CreateReadingLogDto {
  return {
    myBookId: 1,
    startPage: 10,
    endPage: 20,
    startTime: new Date('2026-01-01T10:00:00Z'),
    endTime: new Date('2026-01-01T11:00:00Z'),
    date: '2026-01-01',
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

  // date는 시각이 아니라 사용자가 고른 "이 독서가 속한 날"이라 YYYY-MM-DD로 받는다.
  // @db.Date가 UTC 기준으로 날짜를 잘라내므로 UTC 자정으로 정규화해야 하루가 밀리지 않는다.
  describe('date 정규화', () => {
    beforeEach(() => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      mockTx.readingLog.create.mockResolvedValue({ id: 1 });
    });

    it('YYYY-MM-DD를 UTC 자정 Date로 변환한다 (하루 밀림 방지)', async () => {
      await service.create(1, baseCreateDto({ date: '2025-12-11' }));

      const args = firstCallArg(mockTx.readingLog.create) as {
        data: { date: Date };
      };
      expect(args.data.date.toISOString()).toBe('2025-12-11T00:00:00.000Z');
    });

    it('존재하지 않는 날짜(2025-02-30)를 거부한다', async () => {
      // Date가 조용히 2025-03-02로 굴려버리므로 왕복 검증이 없으면 통과해버린다.
      await expect(
        service.create(1, baseCreateDto({ date: '2025-02-30' })),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.readingLog.create).not.toHaveBeenCalled();
    });

    it('미래 날짜를 거부한다 (진도 정렬 1순위 키라 고정될 수 있음)', async () => {
      const future = new Date();
      future.setUTCFullYear(future.getUTCFullYear() + 1);
      const futureDate = future.toISOString().slice(0, 10);

      await expect(
        service.create(1, baseCreateDto({ date: futureDate })),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.readingLog.create).not.toHaveBeenCalled();
    });

    it('오늘 날짜는 허용한다', async () => {
      const today = new Date().toISOString().slice(0, 10);

      await expect(
        service.create(1, baseCreateDto({ date: today })),
      ).resolves.toEqual({ id: 1 });
    });
  });

  // readingMinutes는 더 이상 클라이언트가 보내지 않는다 - 시각과 어긋날 수 없도록 파생한다.
  describe('readingMinutes 파생', () => {
    beforeEach(() => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      mockTx.readingLog.create.mockResolvedValue({ id: 1 });
    });

    it('startTime~endTime 차이로 계산한다', async () => {
      await service.create(
        1,
        baseCreateDto({
          startTime: new Date('2026-01-01T10:00:00Z'),
          endTime: new Date('2026-01-01T12:30:00Z'),
        }),
      );

      const args = firstCallArg(mockTx.readingLog.create) as {
        data: { readingMinutes: number };
      };
      expect(args.data.readingMinutes).toBe(150);
    });

    it('수정 시 시각이 바뀌면 다시 계산한다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue({
        id: 1,
        myBookId: 1,
        startPage: 10,
        endPage: 20,
        startTime: new Date('2026-01-01T10:00:00Z'),
        endTime: new Date('2026-01-01T11:00:00Z'),
      });
      prismaService.myBook.findUniqueOrThrow.mockResolvedValue({
        book: { totalPage: 300 },
      });
      mockTx.readingLog.update.mockResolvedValue({ id: 1 });

      await service.update(1, 1, {
        endTime: new Date('2026-01-01T13:00:00Z'),
      });

      const args = firstCallArg(mockTx.readingLog.update) as {
        data: { readingMinutes: number };
      };
      expect(args.data.readingMinutes).toBe(180);
    });

    it('수정 시 시각이 그대로면 독서 시간을 건드리지 않는다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue({
        id: 1,
        myBookId: 1,
        startPage: 10,
        endPage: 20,
        startTime: new Date('2026-01-01T10:00:00Z'),
        endTime: new Date('2026-01-01T11:00:00Z'),
      });
      prismaService.myBook.findUniqueOrThrow.mockResolvedValue({
        book: { totalPage: 300 },
      });
      mockTx.readingLog.update.mockResolvedValue({ id: 1 });

      await service.update(1, 1, { memo: '메모만 수정' });

      const args = firstCallArg(mockTx.readingLog.update) as {
        data: Record<string, unknown>;
      };
      expect(args.data).not.toHaveProperty('readingMinutes');
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
        data: Record<string, unknown>;
      };
      expect(createArgs.data).toEqual({
        myBookId: dto.myBookId,
        startPage: dto.startPage,
        endPage: dto.endPage,
        startTime: dto.startTime,
        endTime: dto.endTime,
        // date는 문자열이 아니라 UTC 자정 Date로 정규화되고,
        // readingMinutes는 클라이언트 입력이 아니라 파생된다.
        date: new Date('2026-01-01T00:00:00.000Z'),
        readingMinutes: 60,
      });
      expect(myBookService.startReadingIfWantToRead).toHaveBeenCalledWith(
        dto.myBookId,
        mockTx,
      );
      expect(
        myBookService.syncProgressFromLatestReadingLog,
      ).toHaveBeenCalledWith(dto.myBookId, mockTx);
    });
  });

  // ReadingLog는 userId 직접 컬럼이 없어 myBook 관계를 통해서만 소유권을 판별한다.
  // Prisma 목은 where를 평가하지 않으므로, 이 조건은 인자를 직접 단언해야 검증된다.
  describe('소유권 스코프 (where 절)', () => {
    it('findOne은 myBook.userId를 통해 스코프한다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue({
        id: 42,
        myBookId: 1,
      });

      await service.findOne(7, 42);

      const args = firstCallArg(prismaService.readingLog.findFirst) as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({ id: 42, myBook: { userId: 7 } });
    });

    it('findAll은 myBookId를 줘도 사용자 스코프를 함께 건다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      prismaService.readingLog.findMany.mockResolvedValue([]);
      prismaService.readingLog.count.mockResolvedValue(0);

      await service.findAll(7, { myBookId: 42, page: 1, limit: 10 });

      expect(myBookService.assertOwnership).toHaveBeenCalledWith(7, 42);
      const args = firstCallArg(prismaService.readingLog.findMany) as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({ myBook: { userId: 7 }, myBookId: 42 });
    });

    // myBookId 없이 전체를 조회하는 경로 - 여기서 사용자 스코프가 빠지면
    // 남의 독서 기록이 그대로 노출된다.
    it('findAll은 myBookId가 없어도 반드시 사용자 스코프를 건다', async () => {
      prismaService.readingLog.findMany.mockResolvedValue([]);
      prismaService.readingLog.count.mockResolvedValue(0);

      await service.findAll(7, { page: 1, limit: 10 });

      expect(myBookService.assertOwnership).not.toHaveBeenCalled();
      const args = firstCallArg(prismaService.readingLog.findMany) as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({ myBook: { userId: 7 } });
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
    function fakeListRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        myBookId: 3,
        readingMinutes: 60,
        date: new Date('2024-10-23T00:00:00.000Z'),
        myBook: { book: { title: '미움받을 용기', thumbnail: null } },
        ...overrides,
      };
    }

    it('책 정보를 최상위 book으로 매핑하고 페이지네이션 메타를 함께 반환한다', async () => {
      prismaService.readingLog.findMany.mockResolvedValue([fakeListRow()]);
      prismaService.readingLog.count.mockResolvedValue(2);

      const result = await service.findAll(1, { page: 1, limit: 10 });

      expect(result.items[0].book).toEqual({
        title: '미움받을 용기',
        thumbnail: null,
      });
      expect(result.items[0]).not.toHaveProperty('myBook');
      expect(result.meta.totalCount).toBe(2);
    });

    it('같은 날 여러 세션이 있어도 정렬이 결정적이다', async () => {
      prismaService.readingLog.findMany.mockResolvedValue([]);
      prismaService.readingLog.count.mockResolvedValue(0);

      await service.findAll(1, { page: 1, limit: 10 });

      const args = firstCallArg(prismaService.readingLog.findMany) as {
        orderBy: unknown;
      };
      expect(args.orderBy).toEqual([{ date: 'desc' }, { endTime: 'desc' }]);
    });

    describe('기간 필터', () => {
      beforeEach(() => {
        prismaService.readingLog.findMany.mockResolvedValue([]);
        prismaService.readingLog.count.mockResolvedValue(0);
      });

      it('from/to를 UTC 자정 기준 범위로 변환한다', async () => {
        await service.findAll(7, {
          from: '2024-10-01',
          to: '2024-10-31',
          page: 1,
          limit: 100,
        });

        const args = firstCallArg(prismaService.readingLog.findMany) as {
          where: { date: { gte: Date; lte: Date } };
        };
        expect(args.where.date.gte.toISOString()).toBe(
          '2024-10-01T00:00:00.000Z',
        );
        expect(args.where.date.lte.toISOString()).toBe(
          '2024-10-31T00:00:00.000Z',
        );
      });

      it('한쪽만 줘도 동작한다', async () => {
        await service.findAll(7, { from: '2024-10-01', page: 1, limit: 10 });

        const args = firstCallArg(prismaService.readingLog.findMany) as {
          where: { date: Record<string, unknown> };
        };
        expect(Object.keys(args.where.date)).toEqual(['gte']);
      });

      it('from이 to보다 늦으면 거부한다', async () => {
        await expect(
          service.findAll(7, {
            from: '2024-10-31',
            to: '2024-10-01',
            page: 1,
            limit: 10,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('존재하지 않는 날짜를 거부한다', async () => {
        await expect(
          service.findAll(7, { from: '2024-02-30', page: 1, limit: 10 }),
        ).rejects.toThrow(BadRequestException);
      });

      // 기록 저장과 달리 조회 범위는 미래를 허용해야 한다 (이번 달 말일 등).
      it('미래 날짜도 조회 범위로는 허용한다', async () => {
        const future = new Date();
        future.setUTCFullYear(future.getUTCFullYear() + 1);

        await expect(
          service.findAll(7, {
            to: future.toISOString().slice(0, 10),
            page: 1,
            limit: 10,
          }),
        ).resolves.toBeDefined();
      });
    });
  });
});
