import { Prisma } from '@prisma/client';
import { buildPublicReviewListSelect } from './public-review.constants';

export type PublicReviewListItem = Prisma.MyBookReviewGetPayload<{
  select: ReturnType<typeof buildPublicReviewListSelect>;
}>;
