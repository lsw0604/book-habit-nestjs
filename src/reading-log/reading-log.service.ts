import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateReadingLogDto } from './dto/create-reading-log.dto';
import { UpdateReadingLogDto } from './dto/update-reading-log.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import { assertWithinTotalPage, PaginationUtil } from '../common';
import { ReadingLogListSelect } from './reading-log.constants';
import { ReadingLogListItem } from './reading-log.types';

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

  /**
   * 'YYYY-MM-DD'를 UTC 자정 Date로 바꾼다. @db.Date가 UTC 기준으로 날짜를 잘라내므로
   * 반드시 UTC 자정이어야 사용자가 고른 날짜 그대로 저장된다.
   *
   * 정규식만으로는 '2025-02-30'을 거를 수 없다 - Date가 조용히 2025-03-02로
   * 굴려버리기 때문에, 파싱 결과가 입력과 같은지 왕복 검증한다.
   */
  private parseDateOnly(value: string, label: string): Date {
    const parsed = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${label}가 존재하지 않는 날짜입니다.`);
    }

    return parsed;
  }

  /** 조회 필터용 날짜 범위. 기록 저장과 달리 미래 날짜를 허용한다(이번 달 말일 등). */
  private buildDateFilter(
    from: string | undefined,
    to: string | undefined,
  ): Prisma.ReadingLogWhereInput {
    if (from === undefined && to === undefined) {
      return {};
    }

    const gte = from ? this.parseDateOnly(from, '조회 시작 날짜') : undefined;
    const lte = to ? this.parseDateOnly(to, '조회 종료 날짜') : undefined;

    if (gte && lte && gte > lte) {
      throw new BadRequestException(
        '조회 시작 날짜는 종료 날짜보다 늦을 수 없습니다.',
      );
    }

    return { date: { ...(gte && { gte }), ...(lte && { lte }) } };
  }

  private toRecordDate(value: string): Date {
    const parsed = this.parseDateOnly(value, '기록 날짜');

    // date는 "가장 최근 로그" 판정의 1순위 정렬 키라(syncProgressFromLatestReadingLog),
    // 미래 날짜를 허용하면 그 로그가 영원히 최신으로 뽑혀 진도가 고정된다.
    // 클라이언트 타임존을 알 수 없으므로 UTC 기준 하루치 여유를 둔다(최대 오프셋 +14시).
    const tomorrow = new Date();
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    if (parsed > tomorrow) {
      throw new BadRequestException('미래 날짜는 기록할 수 없습니다.');
    }

    return parsed;
  }

  /** 독서 시간은 사용자 입력이 아니라 startTime~endTime에서 파생한다 (둘이 모순될 여지를 없앰). */
  private calcReadingMinutes(startTime: Date, endTime: Date): number {
    return Math.round((endTime.getTime() - startTime.getTime()) / 60_000);
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

    const { date, ...rest } = dto;
    const data = {
      ...rest,
      date: this.toRecordDate(date),
      readingMinutes: this.calcReadingMinutes(dto.startTime, dto.endTime),
    };

    return this.prismaService.$transaction(async (tx) => {
      const readingLog = await tx.readingLog.create({ data });
      await this.myBookService.startReadingIfWantToRead(dto.myBookId, tx);
      await this.myBookService.syncProgressFromLatestReadingLog(
        dto.myBookId,
        tx,
      );
      return readingLog;
    });
  }

  private toListItem(item: ReadingLogListItem) {
    const { myBook, ...rest } = item;

    return { ...rest, book: myBook.book };
  }

  /**
   * 내 독서 기록 목록. myBookId를 주면 그 책의 기록만, 없으면 책 상관없이 전체를 본다.
   *
   * myBookId 유무와 무관하게 where에 `myBook: { userId }`를 항상 건다 -
   * 이 조건이 빠지면 전체 조회 경로로 남의 기록이 그대로 새어나간다.
   * (myBookId가 있을 때 assertOwnership을 함께 호출하는 건, 남의 책 id로 조회했을 때
   *  빈 목록 대신 404를 주기 위함이다.)
   */
  async findAll(
    userId: number,
    {
      myBookId,
      from,
      to,
      page,
      limit,
    }: {
      myBookId?: number;
      from?: string;
      to?: string;
      page: number;
      limit: number;
    },
  ) {
    if (myBookId !== undefined) {
      await this.myBookService.assertOwnership(userId, myBookId);
    }

    const where: Prisma.ReadingLogWhereInput = {
      myBook: { userId },
      ...(myBookId !== undefined && { myBookId }),
      ...this.buildDateFilter(from, to),
    };

    const [items, totalCount] = await this.prismaService.$transaction([
      this.prismaService.readingLog.findMany({
        where,
        ...PaginationUtil.getSkipTake({ pageNumber: page, pageSize: limit }),
        // 같은 날 여러 세션이 있을 수 있어 정렬을 결정적으로 만든다
        // (진도 동기화가 "가장 최근"을 고르는 기준과 동일).
        orderBy: [{ date: 'desc' }, { endTime: 'desc' }],
        select: ReadingLogListSelect,
      }),
      this.prismaService.readingLog.count({ where }),
    ]);

    const meta = PaginationUtil.getPaginationMeta(totalCount, {
      pageNumber: page,
      pageSize: limit,
    });

    return { meta, items: items.map((item) => this.toListItem(item)) };
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
    const merged = {
      startPage: dto.startPage ?? existing.startPage,
      endPage: dto.endPage ?? existing.endPage,
      startTime: dto.startTime ?? existing.startTime,
      endTime: dto.endTime ?? existing.endTime,
    };
    this.assertLogConsistency(merged, totalPage);

    const { date, ...rest } = dto;
    const data = {
      ...rest,
      ...(date !== undefined && { date: this.toRecordDate(date) }),
      // 시각이 하나라도 바뀌면 독서 시간도 다시 파생해야 값이 어긋나지 않는다.
      ...((dto.startTime !== undefined || dto.endTime !== undefined) && {
        readingMinutes: this.calcReadingMinutes(
          merged.startTime,
          merged.endTime,
        ),
      }),
    };

    return this.prismaService.$transaction(async (tx) => {
      const readingLog = await tx.readingLog.update({
        where: { id },
        data,
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
