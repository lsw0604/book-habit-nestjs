import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReadingLogDto {
  @ApiProperty({ description: '연결할 MyBook ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  myBookId: number;

  @ApiProperty({ description: '시작 페이지', example: 100 })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  startPage: number;

  @ApiProperty({ description: '종료 페이지 (시작 페이지 이상)', example: 120 })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  endPage: number;

  @ApiProperty({ description: '시작 시각' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startTime: Date;

  @ApiProperty({ description: '종료 시각 (시작 시각 이후)' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;

  @ApiProperty({ description: '독서 시간(분)', example: 30 })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  readingMinutes: number;

  @ApiProperty({ description: '기록 날짜' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  date: Date;

  @ApiPropertyOptional({
    description: '메모 (읽은 내용, 그날의 감상/기분 등 자유 서술)',
    maxLength: 500,
    example: '집중이 잘 됐다. 3장이 특히 인상 깊었음.',
  })
  @IsString()
  @IsOptional()
  // DB 컬럼이 VarChar(500)이라 검증이 없으면 초과 입력이 DB 레벨에서 터진다.
  @MaxLength(500, { message: '메모는 500자를 초과할 수 없습니다.' })
  memo?: string;
}
