import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({ description: '연결할 ReadingLog ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  readingLogId: number;

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
