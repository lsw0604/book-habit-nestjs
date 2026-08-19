import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({ description: '총 아이템 수' })
  totalCount: number;

  @ApiProperty({ description: '총 페이지 수' })
  totalPages: number;

  @ApiProperty({ description: '현재 페이지 번호' })
  currentPage: number;

  @ApiProperty({ description: '다음 페이지 번호', required: false })
  nextPage?: number;

  @ApiProperty({ description: '이전 페이지 번호', required: false })
  prevPage?: number;

  @ApiProperty({ description: '다음 페이지 존재 여부' })
  hasNextPage: boolean;

  @ApiProperty({ description: '이전 페이지 존재 여부' })
  hasPrevPage: boolean;
}
