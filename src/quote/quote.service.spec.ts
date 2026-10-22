import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import {
  callData,
  callWhere,
  firstCallArg,
} from '../common/testing/test-helpers';

const CREATED_AT = new Date('2026-10-22T00:00:00.000Z');

function fakeQuoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    myBookId: 1,
    readingLogId: 3,
    page: 42,
    content: '인용',
    createdAt: CREATED_AT,
    readingLog: { date: new Date('2026-10-03T00:00:00.000Z') },
    ...overrides,
  };
}

/** assertOwnership가 돌려주는 모양: 사용자 입력 쪽수가 없으면 책 정보의 쪽수를 쓴다. */
function ownedMyBook(totalPage: number | null = 300) {
  return { totalPage: null, book: { totalPage } };
}

describe('QuoteService', () => {
  let service: QuoteService;
  let prismaService: {
    readingLog: { findFirst: jest.Mock };
    quote: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let myBookService: { assertOwnership: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      readingLog: { findFirst: jest.fn() },
      quote: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    myBookService = { assertOwnership: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MyBookService, useValue: myBookService },
      ],
    }).compile();

    service = module.get(QuoteService);
  });

  describe('create', () => {
    it('MyBook 소유권을 확인하고, 독서 기록 없이도 생성한다', async () => {
      myBookService.assertOwnership.mockResolvedValue(ownedMyBook());
      prismaService.quote.create.mockResolvedValue(
        fakeQuoteRow({ readingLogId: null, readingLog: null }),
      );

      const result = await service.create(1, {
        myBookId: 1,
        page: 10,
        content: '인용',
      });

      expect(myBookService.assertOwnership).toHaveBeenCalledWith(1, 1);
      expect(prismaService.readingLog.findFirst).not.toHaveBeenCalled();
      expect(callData(prismaService.quote.create)).toEqual({
        myBookId: 1,
        readingLogId: null,
        page: 10,
        content: '인용',
      });
      expect(result.readingLogDate).toBeNull();
    });

    it('readingLogId를 주면 같은 책의 기록인지 확인한 뒤 연결한다', async () => {
      myBookService.assertOwnership.mockResolvedValue(ownedMyBook());
      prismaService.readingLog.findFirst.mockResolvedValue({ id: 3 });
      prismaService.quote.create.mockResolvedValue(fakeQuoteRow());

      const result = await service.create(1, {
        myBookId: 1,
        readingLogId: 3,
        page: 42,
        content: '인용',
      });

      expect(callWhere(prismaService.readingLog.findFirst)).toEqual({
        id: 3,
        myBookId: 1,
      });
      expect(callData(prismaService.quote.create)).toMatchObject({
        readingLogId: 3,
      });
      expect(result).toEqual({
        id: 1,
        myBookId: 1,
        readingLogId: 3,
        readingLogDate: '2026-10-03',
        page: 42,
        content: '인용',
        createdAt: CREATED_AT,
      });
    });

    it('다른 책의 독서 기록이면 NotFoundException을 던지고 생성하지 않는다', async () => {
      myBookService.assertOwnership.mockResolvedValue(ownedMyBook());
      prismaService.readingLog.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, {
          myBookId: 1,
          readingLogId: 99,
          page: 10,
          content: '인용',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.quote.create).not.toHaveBeenCalled();
    });

    it('페이지가 총 페이지 수를 넘으면 BadRequestException을 던진다', async () => {
      myBookService.assertOwnership.mockResolvedValue(ownedMyBook(300));

      await expect(
        service.create(1, { myBookId: 1, page: 301, content: '인용' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.quote.create).not.toHaveBeenCalled();
    });

    it('MyBook이 본인 것이 아니면 assertOwnership의 404를 그대로 던지고 생성하지 않는다', async () => {
      myBookService.assertOwnership.mockRejectedValue(new NotFoundException());

      await expect(
        service.create(1, { myBookId: 999, page: 10, content: '인용' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.quote.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('MyBook 소유권을 확인한 뒤 그 책의 인용을 페이지순으로 조회한다', async () => {
      myBookService.assertOwnership.mockResolvedValue(ownedMyBook());
      prismaService.quote.findMany.mockResolvedValue([fakeQuoteRow()]);

      const result = await service.findAll(1, { myBookId: 1 });

      expect(myBookService.assertOwnership).toHaveBeenCalledWith(1, 1);
      expect(callWhere(prismaService.quote.findMany)).toEqual({ myBookId: 1 });
      expect(firstCallArg(prismaService.quote.findMany)).toMatchObject({
        orderBy: [{ page: 'asc' }, { id: 'asc' }],
      });
      expect(result[0].readingLogDate).toBe('2026-10-03');
    });

    it('readingLogId로 좁힐 수 있다', async () => {
      myBookService.assertOwnership.mockResolvedValue(ownedMyBook());
      prismaService.quote.findMany.mockResolvedValue([]);

      await service.findAll(1, { myBookId: 1, readingLogId: 3 });

      expect(callWhere(prismaService.quote.findMany)).toEqual({
        myBookId: 1,
        readingLogId: 3,
      });
    });

    it('MyBook이 본인 것이 아니면 조회하지 않는다', async () => {
      myBookService.assertOwnership.mockRejectedValue(new NotFoundException());

      await expect(service.findAll(1, { myBookId: 999 })).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.quote.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('Quote -> MyBook -> userId 경로로 소유권을 확인한다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(fakeQuoteRow());

      await service.findOne(1, 1);

      expect(callWhere(prismaService.quote.findFirst)).toEqual({
        id: 1,
        myBook: { userId: 1 },
      });
    });

    it('접근할 수 없으면 NotFoundException을 던진다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    function owned(totalPage: number | null = 300) {
      return { myBookId: 1, myBook: ownedMyBook(totalPage) };
    }

    it('소유가 아니면 NotFoundException을 던지고 update를 호출하지 않는다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(null);

      await expect(service.update(1, 999, { content: '수정' })).rejects.toThrow(
        NotFoundException,
      );
      expect(callWhere(prismaService.quote.findFirst)).toEqual({
        id: 999,
        myBook: { userId: 1 },
      });
      expect(prismaService.quote.update).not.toHaveBeenCalled();
    });

    it('본인 소유면 수정한다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(owned());
      prismaService.quote.update.mockResolvedValue(
        fakeQuoteRow({ content: '수정' }),
      );

      await service.update(1, 1, { content: '수정' });

      expect(callWhere(prismaService.quote.update)).toEqual({ id: 1 });
      expect(callData(prismaService.quote.update)).toEqual({ content: '수정' });
    });

    it('readingLogId: null이면 확인 없이 연결을 푼다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(owned());
      prismaService.quote.update.mockResolvedValue(
        fakeQuoteRow({ readingLogId: null, readingLog: null }),
      );

      await service.update(1, 1, { readingLogId: null });

      expect(prismaService.readingLog.findFirst).not.toHaveBeenCalled();
      expect(callData(prismaService.quote.update)).toEqual({
        readingLogId: null,
      });
    });

    it('다른 기록으로 다시 연결할 때 인용과 같은 책의 기록인지 확인한다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(owned());
      prismaService.readingLog.findFirst.mockResolvedValue(null);

      await expect(service.update(1, 1, { readingLogId: 99 })).rejects.toThrow(
        NotFoundException,
      );
      expect(callWhere(prismaService.readingLog.findFirst)).toEqual({
        id: 99,
        myBookId: 1,
      });
      expect(prismaService.quote.update).not.toHaveBeenCalled();
    });

    it('페이지가 총 페이지 수를 넘으면 BadRequestException을 던진다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(owned(300));

      await expect(service.update(1, 1, { page: 301 })).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.quote.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('소유가 아니면 NotFoundException을 던지고 delete를 호출하지 않는다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
      expect(prismaService.quote.delete).not.toHaveBeenCalled();
    });

    it('본인 소유면 삭제한다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(fakeQuoteRow());

      await service.remove(1, 1);

      expect(prismaService.quote.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
