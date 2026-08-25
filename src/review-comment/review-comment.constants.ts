import { Prisma } from '@prisma/client';

/**
 * 댓글 응답용 select.
 *
 * user 관계는 반드시 명시적으로 select한다 - bare include로 두면 password/email
 * 같은 민감 필드가 그대로 응답에 실린다 (MyBookTagSelect가 chosung을 막는 것과 같은 이유).
 *
 * 작성자 식별은 author.id로 충분하므로 raw userId는 응답에 담지 않는다.
 */
export const ReviewCommentSelect = {
  id: true,
  myBookReviewId: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, profile: true } },
} satisfies Prisma.ReviewCommentSelect;
