import { BadRequestException } from '@nestjs/common';

// totalPage가 null이면 검증하지 않는다 - 외부 API가 페이지 수를 안 주는
// 책도 있어서, 모르는 값과 비교해 무조건 막아버리면 안 되기 때문
// (MyBookService.update/ReadingLogService.assertLogConsistency가 공유).
// "모름"은 DB에서 null 하나로 통일했지만(0 기본값 제거 마이그레이션), provider가
// 실수로 0을 저장하면 모든 기록이 막히므로 0도 방어적으로 건너뛴다.
export function assertWithinTotalPage(
  page: number,
  totalPage: number | null,
  message: string,
) {
  if (totalPage !== null && totalPage > 0 && page > totalPage) {
    throw new BadRequestException(message);
  }
}
