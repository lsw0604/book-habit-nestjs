import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FindQuoteQueryDto {
  @ApiProperty({ description: '이 MyBook의 인용만 조회', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  myBookId: number;

  @ApiPropertyOptional({
    description: '이 독서 기록에 연결된 인용만 조회 (미지정 시 책 전체)',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readingLogId?: number;
}
