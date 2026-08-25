import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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

  /**
   * 시각(instant)이 아니라 사용자가 고른 "이 독서가 속한 날"이라 날짜 문자열로 받는다.
   * 자정 ISO datetime으로 받으면 타임존 해석이 갈려서, KST 자정을 보내면
   * @db.Date가 UTC 기준으로 잘라내며 하루 전으로 저장된다
   * (예: new Date(2025,11,11).toISOString() === '2025-12-10T15:00:00.000Z').
   * 'YYYY-MM-DD'는 그런 해석 여지가 없다.
   */
  @ApiProperty({
    description: '기록 날짜 (YYYY-MM-DD, 사용자가 선택한 날)',
    example: '2025-12-11',
    format: 'date',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '기록 날짜는 YYYY-MM-DD 형식이어야 합니다.',
  })
  date: string;

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
