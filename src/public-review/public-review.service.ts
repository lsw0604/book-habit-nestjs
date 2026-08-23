import { Injectable } from '@nestjs/common';
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

  private toListItem(item: PublicReviewListItem) {
    const { myBook, reviewLike, ...rest } = item;

    return { ...rest, author: myBook.user, isLiked: reviewLike.length > 0 };
  }
}
