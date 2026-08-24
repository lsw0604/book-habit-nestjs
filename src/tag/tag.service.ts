import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getChoseong } from 'es-hangul';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(private readonly prismaService: PrismaService) {}

  /** value로 Tag를 조회하고 없으면 생성한다. 동시 요청으로 인한 유니크 충돌은 재조회로 흡수한다. */
  async findOrCreate(rawValue: string) {
    const value = rawValue.trim();

    try {
      return await this.prismaService.tag.upsert({
        where: { value },
        create: { value, chosung: getChoseong(value) },
        update: {},
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prismaService.tag.findUniqueOrThrow({ where: { value } });
      }
      throw error;
    }
  }

  /** 완성형 문자열(value) 또는 초성(chosung) 어느 쪽으로 검색해도 매칭되도록 두 컬럼을 함께 조회한다. */
  async search(query: string | undefined, limit: number) {
    return this.prismaService.tag.findMany({
      where: query
        ? {
            OR: [
              { value: { contains: query } },
              { chosung: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { value: 'asc' },
      take: limit,
    });
  }
}
