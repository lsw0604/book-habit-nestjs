import { Prisma } from '@prisma/client';

/**
 * 목록 조회용 select.
 *
 * 전체 조회(myBookId 미지정)에서는 여러 책의 기록이 섞여 나오므로, 각 항목이
 * 어떤 책인지 알 수 있어야 한다 - myBookId만으로는 클라이언트가 책을 식별할 수 없다.
 */
export const ReadingLogListSelect = {
  id: true,
  myBookId: true,
  startPage: true,
  endPage: true,
  startTime: true,
  endTime: true,
  readingMinutes: true,
  date: true,
  memo: true,
  createdAt: true,
  updatedAt: true,
  myBook: {
    select: {
      book: { select: { title: true, thumbnail: true } },
    },
  },
} satisfies Prisma.ReadingLogSelect;
