import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReadingGoalMetric } from '@prisma/client';
import { ReadingGoalService } from './reading-goal.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaError,
  firstCallArg,
} from '../common/testing/test-helpers';

describe('ReadingGoalService', () => {
  let service: ReadingGoalService;
  let prismaService: {
    readingGoal: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      readingGoal: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingGoalService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(ReadingGoalService);
  });

  describe('create', () => {
    it('userId를 포함해 생성한다', async () => {
      prismaService.readingGoal.create.mockResolvedValue({ id: 1 });

      await service.create(1, {
        year: 2026,
        metric: ReadingGoalMetric.BOOK_COUNT,
        targetValue: 20,
      });

      const args = firstCallArg(prismaService.readingGoal.create) as {
        data: Record<string, unknown>;
      };
      expect(args.data).toEqual({
        year: 2026,
        metric: ReadingGoalMetric.BOOK_COUNT,
        targetValue: 20,
        userId: 1,
      });
    });

    it('같은 [userId, year, month, metric] 조합이 이미 있으면(P2002) ConflictException을 던진다', async () => {
      prismaService.readingGoal.create.mockRejectedValue(
        createPrismaError('P2002', { target: ['userId'] }),
      );

      await expect(
        service.create(1, {
          year: 2026,
          metric: ReadingGoalMetric.BOOK_COUNT,
          targetValue: 20,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('year/month가 없으면 userId만으로 조회한다', async () => {
      prismaService.readingGoal.findMany.mockResolvedValue([]);

      await service.findAll(1);

      const args = firstCallArg(prismaService.readingGoal.findMany) as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({ userId: 1 });
    });

    it('year/month가 있으면 함께 필터링한다', async () => {
      prismaService.readingGoal.findMany.mockResolvedValue([]);

      await service.findAll(1, 2026, 3);

      const args = firstCallArg(prismaService.readingGoal.findMany) as {
        where: Record<string, unknown>;
      };
      expect(args.where).toEqual({ userId: 1, year: 2026, month: 3 });
    });
  });

  describe('findOne', () => {
    it('본인 소유가 아니거나 없으면 NotFoundException을 던진다', async () => {
      prismaService.readingGoal.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('대상이 없으면 NotFoundException을 던지고 update를 호출하지 않는다', async () => {
      prismaService.readingGoal.findFirst.mockResolvedValue(null);

      await expect(service.update(1, 999, { targetValue: 30 })).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.readingGoal.update).not.toHaveBeenCalled();
    });

    it('본인 소유면 targetValue만 수정한다', async () => {
      prismaService.readingGoal.findFirst.mockResolvedValue({ id: 1 });
      prismaService.readingGoal.update.mockResolvedValue({
        id: 1,
        targetValue: 30,
      });

      await service.update(1, 1, { targetValue: 30 });

      expect(prismaService.readingGoal.update).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        data: { targetValue: 30 },
      });
    });
  });

  describe('remove', () => {
    it('본인 소유가 아니면(P2025) NotFoundException을 던진다', async () => {
      prismaService.readingGoal.delete.mockRejectedValue(
        createPrismaError('P2025'),
      );

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('본인 소유면 삭제한다', async () => {
      prismaService.readingGoal.delete.mockResolvedValue({ id: 1 });

      await service.remove(1, 1);

      expect(prismaService.readingGoal.delete).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
    });
  });
});
