import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindReadingGoalQueryDto {
  @ApiPropertyOptional({
    description: '조회할 연도 (미지정 시 전체 연도)',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({
    description: '조회할 월 (미지정 시 연간+월간 목표 전체)',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
