import { Prisma } from '@prisma/client';

export const MyBookDetailInclude = {
  book: {
    select: {
      title: true,
      subTitle: true,
      isbn: true,
      authors: true,
      translators: true,
      publisher: true,
      thumbnail: true,
      coverImage: true,
      description: true,
      url: true,
      pubDate: true,
      totalPage: true,
    },
  },
  review: {
    select: {
      id: true,
    },
  },
  _count: {
    select: {
      readingLog: true,
    },
  },
} satisfies Prisma.MyBookInclude;

export const MyBooksListSelect = {
  id: true,
  status: true,
  rating: true,
  currentPage: true, // UI 진행률용
  totalPage: true, // UI 진행률용 - 사용자가 직접 입력한 값 (없으면 book.totalPage)
  readCount: true,
  book: {
    select: {
      title: true,
      thumbnail: true,
      totalPage: true, // UI 진행률용
    },
  },
} satisfies Prisma.MyBookSelect;
