import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class FindReadingLogQueryDto {
  @ApiPropertyOptional({
    description: '특정 MyBook의 기록만 조회 (미지정 시 내 전체 기록)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  myBookId?: number;

  @ApiPropertyOptional({
    description: '조회 시작 날짜 (YYYY-MM-DD, 해당일 포함)',
    example: '2024-10-01',
    format: 'date',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, {
    message: '조회 시작 날짜는 YYYY-MM-DD 형식이어야 합니다.',
  })
  from?: string;

  @ApiPropertyOptional({
    description: '조회 종료 날짜 (YYYY-MM-DD, 해당일 포함)',
    example: '2024-10-31',
    format: 'date',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, {
    message: '조회 종료 날짜는 YYYY-MM-DD 형식이어야 합니다.',
  })
  to?: string;

  @ApiPropertyOptional({
    description: '페이지 번호',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '페이지 번호는 정수여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page: number = 1;

  @ApiPropertyOptional({
    description: '한 페이지에 보여질 항목 수',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '페이지당 항목 수는 정수여야 합니다.' })
  @Min(1, { message: '페이지당 항목 수는 1 이상이어야 합니다.' })
  @Max(100, { message: '페이지당 항목 수는 100 이하여야 합니다.' })
  limit: number = 20;
}
