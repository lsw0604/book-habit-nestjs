import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookDetailResDto } from './dto/book-detail-res.dto';
import { BookLookupResDto } from './dto/book-lookup-res.dto';
import { BookLookupService } from './book-lookup.service';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookLookupService: BookLookupService,
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
    // Book은 갱신하지 않으므로 저자가 빈 책은 빈 채로 남는다(카카오가 저자를 비운 그림책 등).
    // 얼마나 생기는지 셀 수 있게 실제로 만들 때만 남긴다(상세 조회는 저장하지 않으니 제외).
    // 같은 새 책을 동시에 담으면 두 번 남을 수 있다 - 아주 드문 과다 집계라 받아들인다.
    if (dto.authors.length === 0) {
      this.logger.warn(`저자 없이 Book을 만든다(isbn=${dto.isbn})`);
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

  /**
   * 외부 API 조회의 유일한 진입점(서재 등록/상세 조회 공용). 공급원을 바꿀 때 여기만 바꾼다.
   * 못 찾으면 BookLookupService가 NotFoundException을 던진다.
   */
  private lookup(isbn: string): Promise<BookLookupResDto> {
    return this.bookLookupService.getByIsbn(isbn);
  }
}
