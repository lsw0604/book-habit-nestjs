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
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  myBookId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  startPage: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  endPage: number;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  readingMinutes: number;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  date: Date;

  @IsString()
  @IsOptional()
  memo?: string;

  @IsEnum(ReadingMood)
  @IsOptional()
  readingMood?: ReadingMood;
}
