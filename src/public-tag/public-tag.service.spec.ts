import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PublicTagService } from './public-tag.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_TAG_MIN_DISTINCT_USERS } from './public-tag.constants';
import { firstCallArg } from '../common/testing/test-helpers';

/** 공백 차이에 흔들리지 않도록 SQL 문자열을 한 줄로 정규화한다. */
function normalizedSql(sql: Prisma.Sql): string {
  return sql.sql.replace(/\s+/g, ' ').trim();
}

describe('PublicTagService', () => {
  let service: PublicTagService;
  let prismaService: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prismaService = { $queryRaw: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicTagService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(PublicTagService);
  });

  describe('findPopular', () => {
    it('BigInt로 오는 count를 number로 바꿔 FE 계약({ tagId, value, count }) 그대로 반환한다', async () => {
      prismaService.$queryRaw.mockResolvedValue([
        { tagId: 12, value: '자기계발', count: 1840n },
        { tagId: 3, value: '심리학', count: 1520n },
      ]);

      const result = await service.findPopular(20);

      expect(result).toEqual([
        { tagId: 12, value: '자기계발', count: 1840 },
        { tagId: 3, value: '심리학', count: 1520 },
      ]);
      expect(typeof result[0].count).toBe('number');
    });

    // 목 Prisma는 SQL을 실행하지 않으므로, 조건이 쿼리에서 빠져도 결과 검증만으로는
    // 잡히지 않는다 — 쿼리 자체를 단언한다.
    it('서로 다른 사용자 수로 거르는 조건을 바인딩 값과 함께 건다', async () => {
      await service.findPopular(20);

      const sql = firstCallArg(prismaService.$queryRaw) as Prisma.Sql;
      expect(normalizedSql(sql)).toContain(
        'HAVING COUNT(DISTINCT mb.userId) >= ?',
      );
      expect(sql.values[0]).toBe(PUBLIC_TAG_MIN_DISTINCT_USERS);
    });

    it('많이 붙은 순(동점은 tagId 오름차순)으로 limit개까지 조회한다', async () => {
      await service.findPopular(7);

      const sql = firstCallArg(prismaService.$queryRaw) as Prisma.Sql;
      expect(normalizedSql(sql)).toContain(
        'ORDER BY count DESC, t.id ASC LIMIT ?',
      );
      expect(sql.values[1]).toBe(7);
    });

    it('isbn이 없으면 책으로 거르지 않고 전체를 집계한다', async () => {
      await service.findPopular(20);

      const sql = firstCallArg(prismaService.$queryRaw) as Prisma.Sql;
      expect(normalizedSql(sql)).not.toContain('b.isbn');
      expect(sql.values).toEqual([PUBLIC_TAG_MIN_DISTINCT_USERS, 20]);
    });

    it('isbn이 있으면 그 책의 MyBook에 붙은 태그만 집계한다', async () => {
      await service.findPopular(20, '9788996991342');

      const sql = firstCallArg(prismaService.$queryRaw) as Prisma.Sql;
      expect(normalizedSql(sql)).toContain(
        'JOIN `Book` b ON b.id = mb.bookId WHERE b.isbn = ? GROUP BY',
      );
      expect(sql.values).toEqual([
        '9788996991342',
        PUBLIC_TAG_MIN_DISTINCT_USERS,
        20,
      ]);
    });

    it('chosung 등 내부 컬럼을 select하지 않는다', async () => {
      await service.findPopular(20);

      const sql = firstCallArg(prismaService.$queryRaw) as Prisma.Sql;
      expect(normalizedSql(sql)).not.toContain('chosung');
    });
  });
});
