import { Prisma } from '@prisma/client';
import { ReviewCommentSelect } from './review-comment.constants';

export type ReviewCommentItem = Prisma.ReviewCommentGetPayload<{
  select: typeof ReviewCommentSelect;
}>;
