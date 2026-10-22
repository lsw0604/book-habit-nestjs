import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  assertWithinTotalPage,
  formatDateOnly,
  resolveTotalPage,
} from '../common';
import { MyBookService } from '../my-book/my-book.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { FindQuoteQueryDto } from './dto/find-quote.query.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

const QuoteSelect = {
  id: true,
  myBookId: true,
  readingLogId: true,
  page: true,
  content: true,
  createdAt: true,
  readingLog: { select: { date: true } },
} satisfies Prisma.QuoteSelect;

type QuoteRow = Prisma.QuoteGetPayload<{ select: typeof QuoteSelect }>;

function toQuoteResponse({ readingLog, ...quote }: QuoteRow): QuoteResponseDto {
  return { ...quote, readingLogDate: formatDateOnly(readingLog?.date ?? null) };
}

const PAGE_OVER_TOTAL_MESSAGE =
  '인용 페이지가 총 페이지 수를 초과할 수 없습니다.';

/**
 * Quote는 MyBook에 속하고 ReadingLog 연결은 선택이다. 소유권은 MyBook 하나로 판단한다:
 * 생성/목록은 MyBookService.assertOwnership, 단건은 myBook: { userId } 관계 필터(assert 후 변경).
 */
@Injectable()
export class QuoteService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly myBookService: MyBookService,
  ) {}

  /**
   * 연결하려는 독서 기록이 같은 책의 것인지 확인한다. 책의 소유권은 호출부가 이미 확인했으므로
   * myBookId만 맞으면 본인 것이다. 다른 책(또는 남)의 기록이면 존재 여부를 드러내지 않고 404.
   */
  private async assertReadingLogInMyBook(
    readingLogId: number,
    myBookId: number,
  ) {
    const readingLog = await this.prismaService.readingLog.findFirst({
      where: { id: readingLogId, myBookId },
      select: { id: true },
    });

    if (!readingLog) {
      throw new NotFoundException('이 책의 독서 기록을 찾을 수 없습니다.');
    }
  }

  async create(userId: number, dto: CreateQuoteDto) {
    const myBook = await this.myBookService.assertOwnership(
      userId,
      dto.myBookId,
    );
    assertWithinTotalPage(
      dto.page,
      resolveTotalPage(myBook),
      PAGE_OVER_TOTAL_MESSAGE,
    );
    if (dto.readingLogId != null) {
      await this.assertReadingLogInMyBook(dto.readingLogId, dto.myBookId);
    }

    const quote = await this.prismaService.quote.create({
      data: {
        myBookId: dto.myBookId,
        readingLogId: dto.readingLogId ?? null,
        page: dto.page,
        content: dto.content,
      },
      select: QuoteSelect,
    });
    return toQuoteResponse(quote);
  }

  async findAll(userId: number, { myBookId, readingLogId }: FindQuoteQueryDto) {
    await this.myBookService.assertOwnership(userId, myBookId);

    const quotes = await this.prismaService.quote.findMany({
      where: {
        myBookId,
        ...(readingLogId !== undefined && { readingLogId }),
      },
      select: QuoteSelect,
      orderBy: [{ page: 'asc' }, { id: 'asc' }],
    });
    return quotes.map(toQuoteResponse);
  }

  async findOne(userId: number, id: number) {
    const quote = await this.prismaService.quote.findFirst({
      where: { id, myBook: { userId } },
      select: QuoteSelect,
    });

    if (!quote) {
      throw new NotFoundException('인용구를 찾을 수 없습니다.');
    }

    return toQuoteResponse(quote);
  }

  async update(userId: number, id: number, dto: UpdateQuoteDto) {
    const existing = await this.prismaService.quote.findFirst({
      where: { id, myBook: { userId } },
      select: {
        myBookId: true,
        myBook: {
          select: { totalPage: true, book: { select: { totalPage: true } } },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('인용구를 찾을 수 없습니다.');
    }

    if (dto.page !== undefined) {
      assertWithinTotalPage(
        dto.page,
        resolveTotalPage(existing.myBook),
        PAGE_OVER_TOTAL_MESSAGE,
      );
    }
    // null은 연결 해제라 확인할 것이 없다.
    if (dto.readingLogId != null) {
      await this.assertReadingLogInMyBook(dto.readingLogId, existing.myBookId);
    }

    const quote = await this.prismaService.quote.update({
      where: { id },
      data: { ...dto },
      select: QuoteSelect,
    });
    return toQuoteResponse(quote);
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    await this.prismaService.quote.delete({ where: { id } });
  }
}
