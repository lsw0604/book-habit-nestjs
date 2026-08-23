import { ApiPropertyOptional } from '@nestjs/swagger';
import { MyBookStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateMyBookDto {
  @ApiPropertyOptional({
    description: '평점 (0~5)',
    minimum: 0,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsInt({ message: '평점은 정수여야 합니다.' })
  @Min(0, { message: '평점은 0 이상이어야 합니다.' })
  @Max(5, { message: '평점은 5 이하여야 합니다.' })
  rating?: number;

  @ApiPropertyOptional({
    description: '변경할 상태',
    enum: MyBookStatus,
  })
  @IsOptional()
  @IsEnum(MyBookStatus, { message: '유효한 상태 값이 아닙니다.' })
  status?: MyBookStatus;

  @ApiPropertyOptional({
    description: '현재 읽은 페이지 (책의 총 페이지 수를 초과할 수 없음)',
    minimum: 0,
    example: 120,
  })
  @IsOptional()
  @IsInt({ message: '현재 페이지는 정수여야 합니다.' })
  @Min(0, { message: '현재 페이지는 0 이상이어야 합니다.' })
  currentPage?: number;
}
