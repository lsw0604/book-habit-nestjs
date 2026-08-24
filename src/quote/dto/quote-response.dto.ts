import { ApiProperty } from '@nestjs/swagger';

export class QuoteResponseDto {
  @ApiProperty({ description: 'Quote ID', example: 1 })
  id: number;

  @ApiProperty({ description: '연결된 ReadingLog ID', example: 1 })
  readingLogId: number;

  @ApiProperty({ description: '인용구가 있는 페이지', example: 42 })
  page: number;

  @ApiProperty({ description: '인용구 내용' })
  content: string;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;
}
