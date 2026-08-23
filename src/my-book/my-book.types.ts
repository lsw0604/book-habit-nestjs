import { Prisma } from '@prisma/client';
import { MyBookDetailInclude, MyBooksListSelect } from './my-book.constants';

export type MyBookDetail = Prisma.MyBookGetPayload<{
  include: typeof MyBookDetailInclude;
}>;

export type MyBookList = Prisma.MyBookGetPayload<{
  select: typeof MyBooksListSelect;
}>;
