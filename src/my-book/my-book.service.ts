import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MyBook, MyBookStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from '../books/books.service';
import { PaginationUtil } from '../common';
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        this.isTargetViolation(error.meta?.target, 'userId')
      ) {
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

  /** Prisma P2002 에러의 error.meta.target이 특정 제약을 포함하는지 안전하게 확인한다. */
  private isTargetViolation(target: unknown, field: string): boolean {
    if (typeof target === 'string') {
      return target.includes(field);
    }
    if (Array.isArray(target)) {
      return target.some((t) => typeof t === 'string' && t.includes(field));
    }
    return false;
  }

  async findAll(
    userId: number,
    status: MyBookStatus | undefined,
    {
      page,
      limit,
      minRating,
      hasReview,
    }: {
      page: number;
      limit: number;
      minRating?: number;
      hasReview?: boolean;
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
        orderBy: [
          { lastReadAt: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
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

  async remove(userId: number, id: number) {
    try {
      await this.prismaService.myBook.delete({ where: { id, userId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('서재 항목을 찾을 수 없습니다.');
      }
      throw error;
    }
  }
}
