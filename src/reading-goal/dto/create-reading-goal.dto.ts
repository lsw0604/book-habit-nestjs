import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReadingGoalMetric } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateReadingGoalDto {
  @ApiProperty({ description: '목표 연도', example: 2026 })
  @IsInt()
  @IsNotEmpty()
  @Min(2000)
  year: number;

  @ApiPropertyOptional({
    description: '목표 월 (미지정 시 연간 목표, 지정 시 해당 월의 월간 목표)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiProperty({ description: '목표 지표', enum: ReadingGoalMetric })
  @IsEnum(ReadingGoalMetric)
  @IsNotEmpty()
  metric: ReadingGoalMetric;

  @ApiProperty({ description: '목표 값', example: 20 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  targetValue: number;
}
