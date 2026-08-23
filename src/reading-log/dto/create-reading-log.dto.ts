import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ReadingMood } from '@prisma/client';
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

  @ApiPropertyOptional({ description: '메모', maxLength: 500 })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiPropertyOptional({ description: '독서 중 기분', enum: ReadingMood })
  @IsEnum(ReadingMood)
  @IsOptional()
  readingMood?: ReadingMood;
}
