import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindReadingLogQueryDto {
  @ApiProperty({ description: '연결된 MyBook ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  myBookId: number;

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
