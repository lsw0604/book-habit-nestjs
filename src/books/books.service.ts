import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AladinBookSearchService } from './providers';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aladinBookSearchService: AladinBookSearchService,
  ) {}

  public async findOrCreate(isbn: string) {
    const local = await this.prisma.book.findUnique({
      where: {
        isbn,
      },
    });

    if (local) return local;

    const dto = await this.aladinBookSearchService.getByIsbn(isbn);
    if (!dto.isbn) {
      throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
    }

    try {
      return await this.prisma.book.upsert({
        where: { isbn: dto.isbn },
        create: dto,
        update: {},
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.book.findUnique({
          where: { isbn: dto.isbn },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
}
