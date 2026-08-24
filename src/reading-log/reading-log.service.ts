import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReadingLogDto } from './dto/create-reading-log.dto';
import { UpdateReadingLogDto } from './dto/update-reading-log.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import { assertWithinTotalPage, PaginationUtil } from '../common';

@Injectable()
export class ReadingLogService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly myBookService: MyBookService,
  ) {}

  private async getBookTotalPage(myBookId: number) {
    const myBook = await this.prismaService.myBook.findUniqueOrThrow({
      where: { id: myBookId },
      select: { book: { select: { totalPage: true } } },
    });

    return myBook.book.totalPage;
  }

  /** startPage/endPage, startTime/endTime의 논리적 모순과 book.totalPage 초과 여부를 검증한다. */
  private assertLogConsistency(
    input: {
      startPage: number;
      endPage: number;
      startTime: Date;
      endTime: Date;
    },
    totalPage: number | null,
  ) {
    if (input.endPage < input.startPage) {
      throw new BadRequestException(
        '종료 페이지는 시작 페이지보다 작을 수 없습니다.',
      );
    }

    assertWithinTotalPage(
      input.endPage,
      totalPage,
      '종료 페이지가 총 페이지 수를 초과할 수 없습니다.',
    );

    if (input.endTime < input.startTime) {
      throw new BadRequestException(
        '종료 시각은 시작 시각보다 빠를 수 없습니다.',
      );
    }
  }

  async create(userId: number, dto: CreateReadingLogDto) {
    const myBook = await this.myBookService.assertOwnership(
      userId,
      dto.myBookId,
    );
    this.assertLogConsistency(dto, myBook.book.totalPage);

    return this.prismaService.$transaction(async (tx) => {
      const readingLog = await tx.readingLog.create({ data: { ...dto } });
      await this.myBookService.startReadingIfWantToRead(dto.myBookId, tx);
      await this.myBookService.syncProgressFromLatestReadingLog(
        dto.myBookId,
        tx,
      );
      return readingLog;
    });
  }

  async findAll(
    userId: number,
    myBookId: number,
    { page, limit }: { page: number; limit: number },
  ) {
    await this.myBookService.assertOwnership(userId, myBookId);

    const where = { myBookId };

    const [items, totalCount] = await this.prismaService.$transaction([
      this.prismaService.readingLog.findMany({
        where,
        ...PaginationUtil.getSkipTake({ pageNumber: page, pageSize: limit }),
        orderBy: { date: 'desc' },
      }),
      this.prismaService.readingLog.count({ where }),
    ]);

    const meta = PaginationUtil.getPaginationMeta(totalCount, {
      pageNumber: page,
      pageSize: limit,
    });

    return { meta, items };
  }

  async findOne(userId: number, id: number) {
    const readingLog = await this.prismaService.readingLog.findFirst({
      where: { id, myBook: { userId } },
    });

    if (!readingLog) {
      throw new NotFoundException('독서 기록을 찾을 수 없습니다.');
    }

    return readingLog;
  }

  async update(userId: number, id: number, dto: UpdateReadingLogDto) {
    const existing = await this.findOne(userId, id);

    const totalPage = await this.getBookTotalPage(existing.myBookId);
    this.assertLogConsistency(
      {
        startPage: dto.startPage ?? existing.startPage,
        endPage: dto.endPage ?? existing.endPage,
        startTime: dto.startTime ?? existing.startTime,
        endTime: dto.endTime ?? existing.endTime,
      },
      totalPage,
    );

    return this.prismaService.$transaction(async (tx) => {
      const readingLog = await tx.readingLog.update({
        where: { id },
        data: { ...dto },
      });
      await this.myBookService.syncProgressFromLatestReadingLog(
        existing.myBookId,
        tx,
      );
      return readingLog;
    });
  }

  async remove(userId: number, id: number) {
    const existing = await this.findOne(userId, id);

    await this.prismaService.$transaction(async (tx) => {
      await tx.readingLog.delete({ where: { id } });
      await this.myBookService.syncProgressFromLatestReadingLog(
        existing.myBookId,
        tx,
      );
    });
  }
}
