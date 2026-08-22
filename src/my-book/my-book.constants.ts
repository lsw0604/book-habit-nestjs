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
      stockStatus: true,
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
  readCount: true,
  book: {
    select: {
      title: true,
      thumbnail: true,
      totalPage: true, // UI 진행률용
    },
  },
} satisfies Prisma.MyBookSelect;
