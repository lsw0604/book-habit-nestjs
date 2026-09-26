import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_TAG_MIN_DISTINCT_USERS } from './public-tag.constants';
import type { PublicTagItemDto } from './dto/public-tag-response.dto';

interface PublicTagRow {
  tagId: number;
  value: string;
  count: bigint;
}

@Injectable()
export class PublicTagService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 전체 사용자의 서재에서 태그별로 붙은 `MyBook` 수를 집계해 많이 붙은 순으로 반환한다.
   * `isbn`을 주면 그 책의 `MyBook`만 집계한다(책 상세 페이지용). 아무도 담지 않은 책은
   * 404가 아니라 빈 배열이다.
   *
   * raw SQL인 이유: "서로 다른 사용자 수"(`COUNT(DISTINCT userId)`)로 거르는 조건은
   * Prisma `groupBy`로 표현할 수 없다. `MyBookTag`는 `[myBookId, tagId]`가 유니크라
   * 행 수가 곧 태그가 붙은 `MyBook` 수다. 한 책 안에서는 `MyBook`이 `[userId, bookId]`
   * 유니크라 `count`가 곧 사용자 수이므로, 사용자 수 기준은 "`count` 2 이상"과 같아진다.
   */
  async findPopular(limit: number, isbn?: string): Promise<PublicTagItemDto[]> {
    const bookFilter = isbn
      ? Prisma.sql`JOIN \`Book\` b ON b.id = mb.bookId WHERE b.isbn = ${isbn}`
      : Prisma.empty;

    const rows = await this.prismaService.$queryRaw<PublicTagRow[]>(Prisma.sql`
      SELECT t.id AS tagId, t.value AS value, COUNT(*) AS count
      FROM \`MyBookTag\` mbt
      JOIN \`MyBook\` mb ON mb.id = mbt.myBookId
      JOIN \`Tag\` t ON t.id = mbt.tagId
      ${bookFilter}
      GROUP BY t.id, t.value
      HAVING COUNT(DISTINCT mb.userId) >= ${PUBLIC_TAG_MIN_DISTINCT_USERS}
      ORDER BY count DESC, t.id ASC
      LIMIT ${limit}
    `);

    // MySQL의 COUNT(*)는 Prisma raw 쿼리에서 BigInt로 온다 — 그대로 두면 JSON 직렬화가 터진다.
    return rows.map(({ tagId, value, count }) => ({
      tagId,
      value,
      count: Number(count),
    }));
  }
}
