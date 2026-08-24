import { Prisma } from '@prisma/client';

/** 응답에 Tag.chosung(초성 검색용 내부 컬럼)이 노출되지 않도록 명시적으로 select한다. */
export const MyBookTagSelect = {
  id: true,
  myBookId: true,
  createdAt: true,
  tag: { select: { id: true, value: true } },
} satisfies Prisma.MyBookTagSelect;
