import { BadRequestException } from '@nestjs/common';

// totalPage가 null이거나 0이면 검증하지 않는다 - 외부 API가 페이지 수를 안 주는
// 책도 있어서, 모르는 값과 비교해 무조건 막아버리면 안 되기 때문
// (MyBookService.update/ReadingLogService.assertLogConsistency가 공유).
export function assertWithinTotalPage(
  page: number,
  totalPage: number | null,
  message: string,
) {
  if (totalPage !== null && totalPage > 0 && page > totalPage) {
    throw new BadRequestException(message);
  }
}
