import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationUtil } from '../common';
import { buildPublicReviewListSelect } from './public-review.constants';
import { PublicReviewListItem } from './public-review.types';

@Injectable()
export class PublicReviewService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 공개 한줄평을 최신순으로 페이지네이션 조회한다. 비로그인 요청도 허용한다.
   * isbn이 있으면 해당 책으로 필터링하고, 없으면 책 종류 상관없이 전체 피드를 반환한다.
   * (내부 Book ID가 아니라 isbn을 받는 이유는 find-public-review.query.dto.ts 참고)
   * userId는 각 리뷰를 요청자가 좋아요 눌렀는지(isLiked) 판단하는 데 쓰이며,
   * 비로그인(undefined)이면 모든 항목의 isLiked가 false로 내려간다.
   */
  async findAll(
    userId: number | undefined,
    isbn: string | undefined,
    { page, limit }: { page: number; limit: number },
  ) {
    const where: Prisma.MyBookReviewWhereInput = {
      isPublic: true,
      ...(isbn !== undefined && { myBook: { book: { isbn } } }),
    };

    const [items, totalCount] = await this.prismaService.$transaction([
      this.prismaService.myBookReview.findMany({
        where,
        ...PaginationUtil.getSkipTake({ pageNumber: page, pageSize: limit }),
        orderBy: { createdAt: 'desc' },
        select: buildPublicReviewListSelect(userId),
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
   * 공개 한줄평 단건 조회. 비로그인도 허용하며, 목록과 동일한 형태
   * (author/isLiked 포함, 내부 식별자인 myBookId/isPublic 제외)로 반환한다.
   *
   * 비공개 리뷰는 소유자가 요청해도 여기서는 조회되지 않는다 - 본인 리뷰의
   * 관리용 조회는 my-book-review 모듈이 담당한다 (공개 피드와 책임 분리).
   */
  async findOne(userId: number | undefined, id: number) {
    const review = await this.prismaService.myBookReview.findFirst({
      where: { id, isPublic: true },
      select: buildPublicReviewListSelect(userId),
    });

    if (!review) {
      throw new NotFoundException('공개된 한줄평을 찾을 수 없습니다.');
    }

    return this.toListItem(review);
  }

  private toListItem(item: PublicReviewListItem) {
    const { myBook, reviewLike, ...rest } = item;

    return { ...rest, author: myBook.user, isLiked: reviewLike.length > 0 };
  }
}
