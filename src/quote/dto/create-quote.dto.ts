import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({ description: '인용이 속한 MyBook ID', example: 1 })
  @IsInt()
  @Min(1)
  myBookId: number;

  @ApiPropertyOptional({
    description:
      '이 인용을 남긴 독서 기록 ID. 같은 책의 기록만 연결할 수 있다. 생략하거나 null이면 연결하지 않는다',
    nullable: true,
    type: Number,
    example: 3,
  })
  // @IsOptional은 undefined와 null 모두 검증을 건너뛴다 - null은 "연결 없음"으로 그대로 전달된다.
  @IsOptional()
  @IsInt()
  @Min(1)
  readingLogId?: number | null;

  @ApiProperty({ description: '인용구가 있는 페이지', example: 42 })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  page: number;

  @ApiProperty({ description: '인용구 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
