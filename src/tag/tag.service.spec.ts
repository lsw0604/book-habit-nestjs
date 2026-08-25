import { Test, TestingModule } from '@nestjs/testing';
import { getChoseong } from 'es-hangul';
import { TagService } from './tag.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createPrismaError,
  firstCallArg,
} from '../common/testing/test-helpers';

describe('TagService', () => {
  let service: TagService;
  let prismaService: {
    tag: {
      upsert: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      tag: {
        upsert: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(TagService);
  });

  describe('findOrCreate', () => {
    it('앞뒤 공백을 제거하고 chosung을 계산해 upsert한다', async () => {
      prismaService.tag.upsert.mockResolvedValue({
        id: 1,
        value: '자기계발',
        chosung: 'ㅈㄱㄱㅂ',
      });

      await service.findOrCreate('  자기계발  ');

      const args = firstCallArg(prismaService.tag.upsert) as {
        where: { value: string };
        create: { value: string; chosung: string };
        update: Record<string, unknown>;
      };
      expect(args.where).toEqual({ value: '자기계발' });
      expect(args.create).toEqual({
        value: '자기계발',
        chosung: getChoseong('자기계발'),
      });
      expect(args.update).toEqual({});
    });

    it('동시 요청으로 유니크 충돌(P2002)이 나면 재조회해서 반환한다', async () => {
      prismaService.tag.upsert.mockRejectedValue(createPrismaError('P2002'));
      prismaService.tag.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        value: '자기계발',
        chosung: 'ㅈㄱㄱㅂ',
      });

      const result = await service.findOrCreate('자기계발');

      expect(prismaService.tag.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { value: '자기계발' },
      });
      expect(result.value).toBe('자기계발');
    });

    it('P2002가 아닌 다른 에러는 그대로 전파한다', async () => {
      const otherError = new Error('boom');
      prismaService.tag.upsert.mockRejectedValue(otherError);

      await expect(service.findOrCreate('자기계발')).rejects.toThrow(
        otherError,
      );
      expect(prismaService.tag.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('query가 없으면 where 조건 없이 전체를 조회한다', async () => {
      prismaService.tag.findMany.mockResolvedValue([]);

      await service.search(undefined, 10);

      const args = firstCallArg(prismaService.tag.findMany) as {
        where: unknown;
        select: unknown;
      };
      expect(args.where).toBeUndefined();
      expect(args.select).toEqual({ id: true, value: true });
    });

    it('query가 있으면 value/chosung 양쪽을 OR로 매칭한다', async () => {
      prismaService.tag.findMany.mockResolvedValue([]);

      await service.search('ㅈㄱ', 10);

      const args = firstCallArg(prismaService.tag.findMany) as {
        where: { OR: unknown[] };
      };
      expect(args.where.OR).toEqual([
        { value: { contains: 'ㅈㄱ' } },
        { chosung: { contains: 'ㅈㄱ' } },
      ]);
    });

    it('select에 chosung을 노출하지 않는다', async () => {
      prismaService.tag.findMany.mockResolvedValue([]);

      await service.search('자기', 10);

      const args = firstCallArg(prismaService.tag.findMany) as {
        select: Record<string, unknown>;
      };
      expect(args.select).not.toHaveProperty('chosung');
    });
  });
});
