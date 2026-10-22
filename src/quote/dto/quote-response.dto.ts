import { ApiProperty } from '@nestjs/swagger';

export class QuoteResponseDto {
  @ApiProperty({ description: 'Quote ID', example: 1 })
  id: number;

  @ApiProperty({ description: '인용이 속한 MyBook ID', example: 1 })
  myBookId: number;

  @ApiProperty({
    description:
      '연결된 독서 기록 ID. 연결하지 않았거나 그 기록이 삭제됐으면 null',
    type: Number,
    nullable: true,
    example: 3,
  })
  readingLogId: number | null;

  @ApiProperty({
    description:
      "연결된 독서 기록의 날짜('YYYY-MM-DD'). '10/3에 읽다가' 같은 표시용이며, 연결이 없으면 null",
    type: String,
    format: 'date',
    nullable: true,
    example: '2026-10-03',
  })
  readingLogDate: string | null;

  @ApiProperty({ description: '인용구가 있는 페이지', example: 42 })
  page: number;

  @ApiProperty({ description: '인용구 내용' })
  content: string;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;
}
