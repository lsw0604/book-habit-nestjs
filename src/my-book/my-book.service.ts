import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MyBook, MyBookStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from '../books/books.service';
import { PaginationUtil, PrismaErrorUtil } from '../common';
import { CreateMyBookDto } from './dto/create-my-book.dto';
import { UpdateMyBookDto } from './dto/update-my-book.dto';
import { MyBookDetailInclude, MyBooksListSelect } from './my-book.constants';
import { MyBookDetail } from './my-book.types';

@Injectable()
export class MyBookService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly booksService: BooksService,
  ) {}

  /**
   * update 경로 전용 상태 전환 계산. 변이 없이 패치 객체를 반환한다.
   * nextStatus가 undefined이거나 현재 status와 동일하면 항상 {}(변경 없음).
   */
  private buildStatusTransition(
    current: Pick<MyBook, 'status' | 'startedAt' | 'finishedAt'>,
    nextStatus?: MyBookStatus,
  ): Prisma.MyBookUpdateInput {
    if (!nextStatus || nextStatus === current.status) {
      return {};
    }

    const now = new Date();

    if (
      current.status === MyBookStatus.WANT_TO_READ &&
      nextStatus === MyBookStatus.CURRENTLY_READING
    ) {
      return { status: nextStatus, startedAt: current.startedAt ?? now };
    }

    if (
      (current.status === MyBookStatus.WANT_TO_READ ||
        current.status === MyBookStatus.CURRENTLY_READING) &&
      nextStatus === MyBookStatus.READ
    ) {
      return {
        status: nextStatus,
        finishedAt: now,
        readCount: { increment: 1 },
      };
    }

    if (
      current.status === MyBookStatus.CURRENTLY_READING &&
      nextStatus === MyBookStatus.WANT_TO_READ
    ) {
      return { status: nextStatus };
    }

    if (
      current.status === MyBookStatus.READ &&
      (nextStatus === MyBookStatus.WANT_TO_READ ||
        nextStatus === MyBookStatus.CURRENTLY_READING)
    ) {
      return { status: nextStatus };
    }

    return {};
  }

  async create(userId: number, createMyBookDto: CreateMyBookDto) {
    const book = await this.booksService.findOrCreate(createMyBookDto.isbn);

    const now = new Date();
    const data: Prisma.MyBookCreateInput = {
      user: { connect: { id: userId } },
      book: { connect: { id: book.id } },
      status: createMyBookDto.status ?? MyBookStatus.WANT_TO_READ,
      ...(createMyBookDto.status === MyBookStatus.CURRENTLY_READING && {
        startedAt: now,
      }),
      ...(createMyBookDto.status === MyBookStatus.READ && {
        finishedAt: now,
        readCount: 1,
      }),
    };

    try {
      const myBook = await this.prismaService.myBook.create({
        data,
        include: MyBookDetailInclude,
      });
      return this.toDetailResponse(myBook);
    } catch (error) {
      if (PrismaErrorUtil.isUniqueConstraintViolation(error, 'userId')) {
        throw new ConflictException('이미 등록된 책입니다.');
      }
      throw error;
    }
  }

  /**
   * MyBookDetailInclude로 조회한 결과를 응답 형태로 변환한다.
   * review는 1:1 관계라 Prisma _count로 집계할 수 없으므로,
   * readingLog와 같은 위치(_count)에서 0/1로 존재 여부만 노출하도록 애플리케이션 레벨에서 매핑한다.
   */
  private toDetailResponse(myBook: MyBookDetail) {
    const { review, _count, ...rest } = myBook;

    return {
      ...rest,
      _count: {
        readingLog: _count.readingLog,
        review: review ? 1 : 0,
      },
    };
  }

  async findAll(
    userId: number,
    status: MyBookStatus | undefined,
    {
      page,
      limit,
      minRating,
      hasReview,
      order,
    }: {
      page: number;
      limit: number;
      minRating?: number;
      hasReview?: boolean;
      order: 'asc' | 'desc';
    },
  ) {
    const where: Prisma.MyBookWhereInput = {
      userId,
      ...(status && { status }),
      ...(minRating !== undefined && { rating: { gte: minRating } }),
      ...(hasReview !== undefined && {
        review: hasReview ? { isNot: null } : { is: null },
      }),
    };

    const [items, totalCount] = await this.prismaService.$transaction([
      this.prismaService.myBook.findMany({
        where,
        ...PaginationUtil.getSkipTake({ pageNumber: page, pageSize: limit }),
        // 방향(order)과 무관하게 한 번도 안 읽은 책은 항상 뒤로 보낸다 -
        // asc로 뒤집는다고 "안 읽은 책 먼저"가 되는 걸 의도한 게 아니라,
        // "가장 오래 전에 읽은/등록한 순"을 보고 싶다는 의도이기 때문.
        orderBy: [
          { lastReadAt: { sort: order, nulls: 'last' } },
          { createdAt: order },
        ],
        select: MyBooksListSelect,
      }),
      this.prismaService.myBook.count({ where }),
    ]);

    const meta = PaginationUtil.getPaginationMeta(totalCount, {
      pageNumber: page,
      pageSize: limit,
    });

    return { meta, items };
  }

  async findOne(userId: number, id: number) {
    const myBook = await this.prismaService.myBook.findFirst({
      where: { id, userId },
      include: MyBookDetailInclude,
    });

    if (!myBook) {
      throw new NotFoundException('서재 항목을 찾을 수 없습니다.');
    }

    return this.toDetailResponse(myBook);
  }

  async update(userId: number, id: number, updateMyBookDto: UpdateMyBookDto) {
    const existing = await this.prismaService.myBook.findFirst({
      where: { id, userId },
      include: { book: { select: { totalPage: true } } },
    });

    if (!existing) {
      throw new NotFoundException('서재 항목을 찾을 수 없습니다.');
    }

    if (
      updateMyBookDto.currentPage !== undefined &&
      existing.book.totalPage !== null &&
      existing.book.totalPage > 0 &&
      updateMyBookDto.currentPage > existing.book.totalPage
    ) {
      throw new BadRequestException(
        '현재 페이지가 총 페이지 수를 초과할 수 없습니다.',
      );
    }

    const statusPatch = this.buildStatusTransition(
      existing,
      updateMyBookDto.status,
    );

    const updated = await this.prismaService.myBook.update({
      where: { id, userId },
      data: {
        ...statusPatch,
        ...(updateMyBookDto.rating !== undefined && {
          rating: updateMyBookDto.rating,
        }),
        ...(updateMyBookDto.currentPage !== undefined && {
          currentPage: updateMyBookDto.currentPage,
        }),
      },
      include: MyBookDetailInclude,
    });

    return this.toDetailResponse(updated);
  }

  /**
   * WANT_TO_READ 상태에서 첫 ReadingLog가 생성되면 CURRENTLY_READING으로 한 방향 승격한다.
   * (읽는 기록이 있는데 상태는 "읽고 싶은 책"으로 남는 모순을 방지 — READ/역방향 전환은 여전히 수동)
   * ReadingLogService.create에서만 호출된다. update/remove는 대상이 아니다.
   */
  async startReadingIfWantToRead(
    myBookId: number,
    tx: Prisma.TransactionClient = this.prismaService,
  ) {
    const myBook = await tx.myBook.findUnique({
      where: { id: myBookId },
      select: { status: true, startedAt: true },
    });

    if (myBook?.status !== MyBookStatus.WANT_TO_READ) {
      return;
    }

    await tx.myBook.update({
      where: { id: myBookId },
      data: {
        status: MyBookStatus.CURRENTLY_READING,
        startedAt: myBook.startedAt ?? new Date(),
      },
    });
  }

  /**
   * myBookId의 ReadingLog 중 가장 최근 것(date desc, endTime desc 기준)을 기준으로
   * MyBook.currentPage/lastReadAt을 재계산한다. 로그가 하나도 없으면 초기값(0/null)으로 되돌린다.
   * ReadingLog의 create/update/remove 직후 같은 트랜잭션(tx) 안에서 호출된다.
   */
  async syncProgressFromLatestReadingLog(
    myBookId: number,
    tx: Prisma.TransactionClient = this.prismaService,
  ) {
    const latestLog = await tx.readingLog.findFirst({
      where: { myBookId },
      orderBy: [{ date: 'desc' }, { endTime: 'desc' }],
    });

    return tx.myBook.update({
      where: { id: myBookId },
      data: {
        currentPage: latestLog?.endPage ?? 0,
        lastReadAt: latestLog?.endTime ?? null,
      },
    });
  }

  async remove(userId: number, id: number) {
    try {
      await this.prismaService.myBook.delete({ where: { id, userId } });
    } catch (error) {
      if (PrismaErrorUtil.isRecordNotFound(error)) {
        throw new NotFoundException('서재 항목을 찾을 수 없습니다.');
      }
      throw error;
    }
  }
}
