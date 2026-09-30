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
    description:
      '이 책의 총 페이지 수를 직접 입력 (책 정보에 페이지 수가 없거나, 전자책/판본처럼 쪽수가 다를 때). null을 보내면 직접 입력한 값을 지우고 책 정보의 값으로 되돌린다. 현재 페이지나 이미 기록한 독서 기록의 종료 페이지보다 작을 수 없음',
    minimum: 1,
    nullable: true,
    type: Number,
    example: 336,
  })
  // @IsOptional은 undefined와 null 모두 검증을 건너뛴다 - null은 "직접 입력 해제"로 그대로 전달된다.
  @IsOptional()
  @IsInt({ message: '총 페이지 수는 정수여야 합니다.' })
  @Min(1, { message: '총 페이지 수는 1 이상이어야 합니다.' })
  totalPage?: number | null;

  @ApiPropertyOptional({
    description: '현재 읽은 페이지 (총 페이지 수를 초과할 수 없음)',
    minimum: 0,
    example: 120,
  })
  @IsOptional()
  @IsInt({ message: '현재 페이지는 정수여야 합니다.' })
  @Min(0, { message: '현재 페이지는 0 이상이어야 합니다.' })
  currentPage?: number;
}
