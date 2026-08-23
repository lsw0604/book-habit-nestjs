import { Prisma } from '@prisma/client';

/** "내가 쓴 리뷰" 목록용 select. book(title/thumbnail)까지 한 쿼리로 조인해서 가져온다. */
export const MyBookReviewListSelect = {
  id: true,
  myBookId: true,
  review: true,
  isPublic: true,
  createdAt: true,
  myBook: {
    select: {
      book: { select: { title: true, thumbnail: true } },
    },
  },
  _count: { select: { reviewLike: true, reviewComment: true } },
} satisfies Prisma.MyBookReviewSelect;
