import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookDetailResDto } from './dto/book-detail-res.dto';
import { BookLookupResDto } from './dto/book-lookup-res.dto';
import { AladinBookSearchService } from './providers';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aladinBookSearchService: AladinBookSearchService,
  ) {}

  /**
   * 도서 상세(GET /books/detail/:isbn). DB를 읽기만 하고 쓰지 않는다 - Book은 서재 등록
   * (findOrCreate) 때만 저장한다. GET은 부작용이 없어야 하고, Book 행이 "누군가 서재에
   * 담은 책"이라는 의미를 유지해야 하기 때문이다.
   * DB에 있으면 그 행으로 응답해 서재에 담긴 책과 상세 화면이 같은 값을 보게 하고,
   * 없을 때만 외부에서 조회한다(저장하지 않음).
   */
  public async findDetailByIsbn(isbn: string): Promise<BookDetailResDto> {
    const local = await this.prisma.book.findUnique({ where: { isbn } });

    return BookDetailResDto.from(local ?? (await this.lookup(isbn)));
  }

  public async findOrCreate(isbn: string) {
    const local = await this.prisma.book.findUnique({
      where: {
        isbn,
      },
    });

    if (local) return local;

    const dto = await this.lookup(isbn);

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

  /**
   * 외부 API 조회의 유일한 진입점(서재 등록/상세 조회 공용).
   * 알라딘 → BookLookupService 전환 시 여기만 바꾸면 된다.
   */
  private async lookup(isbn: string): Promise<BookLookupResDto> {
    const dto = await this.aladinBookSearchService.getByIsbn(isbn);
    if (!dto.isbn) {
      throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
    }
    return dto;
  }
}
