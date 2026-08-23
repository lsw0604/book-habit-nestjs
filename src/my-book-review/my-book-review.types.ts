import { Prisma } from '@prisma/client';
import { MyBookReviewListSelect } from './my-book-review.constants';

export type MyBookReviewListItem = Prisma.MyBookReviewGetPayload<{
  select: typeof MyBookReviewListSelect;
}>;
