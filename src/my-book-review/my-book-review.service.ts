import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import { PaginationUtil, PrismaErrorUtil } from '../common';
import { CreateMyBookReviewDto } from './dto/create-my-book-review.dto';
import { UpdateMyBookReviewDto } from './dto/update-my-book-review.dto';
import { MyBookReviewListSelect } from './my-book-review.constants';
import { MyBookReviewListItem } from './my-book-review.types';

const COUNT_INCLUDE = {
  _count: { select: { reviewLike: true, reviewComment: true } },
} as const;

@Injectable()
export class MyBookReviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly myBookService: MyBookService,
  ) {}

  async create(userId: number, dto: CreateMyBookReviewDto) {
    await this.myBookService.assertOwnership(userId, dto.myBookId);

    try {
      const review = await this.prismaService.myBookReview.create({
        data: { ...dto },
      });

      // 방금 생성된 리뷰라 좋아요/댓글이 있을 수 없으므로 조회 없이 0으로 채운다.
      return { ...review, _count: { reviewLike: 0, reviewComment: 0 } };
    } catch (error) {
      if (PrismaErrorUtil.isUniqueConstraintViolation(error, 'myBookId')) {
        throw new ConflictException('이미 작성된 한줄평이 있습니다.');
      }
      throw error;
    }
  }

  /**
   * 요청자가 작성한 한줄평 전체를 최신순으로 페이지네이션 조회한다.
   * book/isPublic 상관없이 본인 소유면 전부 포함 (마이페이지용 — public-review 피드와는 다름).
   */
  async findAll(
    userId: number,
    { page, limit }: { page: number; limit: number },
  ) {
    const where: Prisma.MyBookReviewWhereInput = { myBook: { userId } };

    const [items, totalCount] = await this.prismaService.$transaction([
      this.prismaService.myBookReview.findMany({
        where,
        ...PaginationUtil.getSkipTake({ pageNumber: page, pageSize: limit }),
        orderBy: { createdAt: 'desc' },
        select: MyBookReviewListSelect,
      }),
      this.prismaService.myBookReview.count({ where }),
    ]);

    const meta = PaginationUtil.getPaginationMeta(totalCount, {
      pageNumber: page,
      pageSize: limit,
    });

    return { meta, items: items.map((item) => this.toListItem(item)) };
  }

  private toListItem(item: MyBookReviewListItem) {
    const { myBook, ...rest } = item;

    return { ...rest, book: myBook.book };
  }

  /** 요청자가 좋아요 누른 한줄평 목록 (접근 가능한 것만 — 좋아요 이후 비공개로 바뀐 남의 글은 제외). */
  async findLiked(userId: number, options: { page: number; limit: number }) {
    return this.findAccessibleWhere(
      { reviewLike: { some: { userId } } },
      userId,
      options,
    );
  }

  /** 요청자가 댓글을 단 한줄평 목록 (접근 가능한 것만). MyBookReview 기준 조회라 리뷰당 1건만 나옴(중복 댓글 무관). */
  async findCommented(
    userId: number,
    options: { page: number; limit: number },
  ) {
    return this.findAccessibleWhere(
      { reviewComment: { some: { userId } } },
      userId,
      options,
    );
  }

  /**
   * extraWhere + "공개거나 본인 소유" 조건을 합쳐 조회한다. findLiked/findCommented가 공유.
   * 정렬 기준은 좋아요/댓글을 남긴 시각이 아니라 리뷰 자체의 createdAt이다
   * (필터링된 relation의 최신 시각으로 정렬하려면 훨씬 복잡한 쿼리가 필요해서 보류).
   */
  private async findAccessibleWhere(
    extraWhere: Prisma.MyBookReviewWhereInput,
    userId: number,
    { page, limit }: { page: number; limit: number },
  ) {
    const where: Prisma.MyBookReviewWhereInput = {
      ...extraWhere,
      OR: this.accessibleOr(userId),
    };

    const [items, totalCount] = await this.prismaService.$transaction([
      this.prismaService.myBookReview.findMany({
        where,
        ...PaginationUtil.getSkipTake({ pageNumber: page, pageSize: limit }),
        orderBy: { createdAt: 'desc' },
        select: MyBookReviewListSelect,
      }),
      this.prismaService.myBookReview.count({ where }),
    ]);

    const meta = PaginationUtil.getPaginationMeta(totalCount, {
      pageNumber: page,
      pageSize: limit,
    });

    return { meta, items: items.map((item) => this.toListItem(item)) };
  }

  /**
   * userId가 없으면(비로그인) "본인 소유" 분기 자체를 OR에서 뺀다. Prisma는
   * where에 값이 undefined인 필드를 조건 없음으로 취급해서 지워버리므로,
   * { myBook: { userId: undefined } }를 그대로 넘기면 전체 허용이 되어버린다.
   */
  private accessibleOr(userId: number | undefined) {
    return [
      { isPublic: true },
      ...(userId !== undefined ? [{ myBook: { userId } }] : []),
    ];
  }

  /**
   * id의 MyBookReview가 요청자에게 공개돼 있는지(isPublic이거나 본인 소유)만 확인한다.
   * _count는 조회하지 않음 — ReviewLike/ReviewComment는 접근 가능 여부만 필요하기 때문.
   * ReviewLike/ReviewComment가 대상 리뷰에 접근 가능한지 확인할 때 재사용된다.
   */
  async assertAccessible(userId: number | undefined, id: number) {
    const review = await this.prismaService.myBookReview.findFirst({
      where: { id, OR: this.accessibleOr(userId) },
    });

    if (!review) {
      throw new NotFoundException('한줄평을 찾을 수 없습니다.');
    }

    return review;
  }

  async findOne(userId: number | undefined, id: number) {
    const review = await this.prismaService.myBookReview.findFirst({
      where: { id, OR: this.accessibleOr(userId) },
      include: COUNT_INCLUDE,
    });

    if (!review) {
      throw new NotFoundException('한줄평을 찾을 수 없습니다.');
    }

    return review;
  }

  private async assertReviewOwnership(userId: number, id: number) {
    const review = await this.prismaService.myBookReview.findFirst({
      where: { id, myBook: { userId } },
    });

    if (!review) {
      throw new NotFoundException('한줄평을 찾을 수 없습니다.');
    }
  }

  async update(userId: number, id: number, dto: UpdateMyBookReviewDto) {
    await this.assertReviewOwnership(userId, id);

    return this.prismaService.myBookReview.update({
      where: { id },
      data: { ...dto },
      include: COUNT_INCLUDE,
    });
  }

  async remove(userId: number, id: number) {
    const { count } = await this.prismaService.myBookReview.deleteMany({
      where: { id, myBook: { userId } },
    });

    if (count === 0) {
      throw new NotFoundException('한줄평을 찾을 수 없습니다.');
    }
  }
}
