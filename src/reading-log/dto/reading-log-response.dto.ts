import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReadingMood } from '@prisma/client';

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

  @ApiPropertyOptional({ description: '메모', nullable: true })
  memo: string | null;

  @ApiPropertyOptional({
    description: '독서 중 기분',
    enum: ReadingMood,
    nullable: true,
  })
  readingMood: ReadingMood | null;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각', type: Date })
  updatedAt: Date;
}
