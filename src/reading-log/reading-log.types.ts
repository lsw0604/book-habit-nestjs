import { Prisma } from '@prisma/client';
import { ReadingLogListSelect } from './reading-log.constants';

export type ReadingLogListItem = Prisma.ReadingLogGetPayload<{
  select: typeof ReadingLogListSelect;
}>;
