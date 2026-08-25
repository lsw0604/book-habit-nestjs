import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { firstCallArg } from '../common/testing/test-helpers';

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(QuoteService);
  });

  describe('create', () => {
    it('ReadingLog가 본인 소유(2단계 관계)인지 확인한 뒤 생성한다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue({ id: 1 });
      prismaService.quote.create.mockResolvedValue({ id: 1 });

      await service.create(1, { readingLogId: 1, page: 10, content: '인용' });

      const args = firstCallArg(prismaService.readingLog.findFirst) as {
        where: { id: number; myBook: { userId: number } };
      };
      expect(args.where).toEqual({ id: 1, myBook: { userId: 1 } });
    });

    it('ReadingLog가 본인 소유가 아니면 NotFoundException을 던지고 생성하지 않는다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, { readingLogId: 999, page: 10, content: '인용' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.quote.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('ReadingLog 소유권을 먼저 확인한 뒤 목록을 조회한다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue({ id: 1 });
      prismaService.quote.findMany.mockResolvedValue([]);

      await service.findAll(1, 1);

      expect(prismaService.readingLog.findFirst).toHaveBeenCalledWith({
        where: { id: 1, myBook: { userId: 1 } },
        select: { id: true },
      });
    });

    it('ReadingLog가 본인 소유가 아니면 NotFoundException을 던진다', async () => {
      prismaService.readingLog.findFirst.mockResolvedValue(null);

      await expect(service.findAll(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('Quote -> ReadingLog -> MyBook -> userId 경로로 소유권을 확인한다', async () => {
      prismaService.quote.findFirst.mockResolvedValue({ id: 1 });

      await service.findOne(1, 1);

      const args = firstCallArg(prismaService.quote.findFirst) as {
        where: { id: number; readingLog: { myBook: { userId: number } } };
      };
      expect(args.where).toEqual({
        id: 1,
        readingLog: { myBook: { userId: 1 } },
      });
    });

    it('접근할 수 없으면 NotFoundException을 던진다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('소유가 아니면 NotFoundException을 던지고 update를 호출하지 않는다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(null);

      await expect(service.update(1, 999, { content: '수정' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.quote.update).not.toHaveBeenCalled();
    });

    it('본인 소유면 수정한다', async () => {
      prismaService.quote.findFirst.mockResolvedValue({ id: 1 });
      prismaService.quote.update.mockResolvedValue({ id: 1, content: '수정' });

      await service.update(1, 1, { content: '수정' });

      expect(prismaService.quote.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { content: '수정' },
      });
    });
  });

  describe('remove', () => {
    it('소유가 아니면 NotFoundException을 던지고 delete를 호출하지 않는다', async () => {
      prismaService.quote.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
      expect(prismaService.quote.delete).not.toHaveBeenCalled();
    });

    it('본인 소유면 삭제한다', async () => {
      prismaService.quote.findFirst.mockResolvedValue({ id: 1 });

      await service.remove(1, 1);

      expect(prismaService.quote.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
