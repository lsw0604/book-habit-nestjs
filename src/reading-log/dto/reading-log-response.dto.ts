import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMeta, PaginationResponse } from '../../common/pagination';

export class ReadingLogResponseDto {
  @ApiProperty({ description: 'ReadingLog ID', example: 1 })
  id: number;

  @ApiProperty({ description: '연결된 MyBook ID', example: 1 })
  myBookId: number;

  @ApiProperty({ description: '시작 페이지', example: 100 })
  startPage: number;

  @ApiProperty({ description: '종료 페이지', example: 120 })
  endPage: number;

  @ApiProperty({ description: '시작 시각', type: Date })
  startTime: Date;

  @ApiProperty({ description: '종료 시각', type: Date })
  endTime: Date;

  @ApiProperty({ description: '독서 시간(분)', example: 30 })
  readingMinutes: number;

  @ApiProperty({ description: '기록 날짜', type: Date })
  date: Date;

  @ApiPropertyOptional({
    description: '메모 (읽은 내용, 그날의 감상/기분 등 자유 서술)',
    nullable: true,
  })
  memo: string | null;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각', type: Date })
  updatedAt: Date;
}

export class ReadingLogListBookDto {
  @ApiProperty({ description: '책 제목', example: '미움받을 용기' })
  title: string;

  @ApiProperty({ description: '썸네일 이미지 URL', nullable: true })
  thumbnail: string | null;
}

// 전체 조회(myBookId 미지정)에서는 여러 책이 섞이므로, 단건 응답과 달리
// 항목마다 어떤 책인지 알 수 있어야 한다.
export class ReadingLogListItemDto extends ReadingLogResponseDto {
  @ApiProperty({ description: '책 정보', type: ReadingLogListBookDto })
  book: ReadingLogListBookDto;
}

export class ReadingLogListResponseDto implements PaginationResponse<
  ReadingLogListItemDto,
  'items'
> {
  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ type: [ReadingLogListItemDto] })
  items: ReadingLogListItemDto[];
}
