import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReadingGoalMetric } from '@prisma/client';

export class ReadingGoalResponseDto {
  @ApiProperty({ description: 'ReadingGoal ID', example: 1 })
  id: number;

  @ApiProperty({ description: '목표 연도', example: 2026 })
  year: number;

  @ApiPropertyOptional({
    description: '목표 월 (null이면 연간 목표)',
    nullable: true,
  })
  month: number | null;

  @ApiProperty({ description: '목표 지표', enum: ReadingGoalMetric })
  metric: ReadingGoalMetric;

  @ApiProperty({ description: '목표 값', example: 20 })
  targetValue: number;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각', type: Date })
  updatedAt: Date;
}
