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
      url: true,
      pubDate: true,
      totalPage: true,
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
      // 클라이언트가 검색 결과와 대조해 "이미 담은 책" 배지를 붙인다. 서재 목록은
      // 한 번에 전부 받으므로(limit 2000) 별도 일괄 조회 API 없이 여기서 해결한다.
      isbn: true,
    },
  },
} satisfies Prisma.MyBookSelect;
