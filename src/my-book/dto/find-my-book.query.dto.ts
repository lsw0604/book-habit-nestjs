import { ApiPropertyOptional } from '@nestjs/swagger';
import { MyBookStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class FindMyBookQueryDto {
  @ApiPropertyOptional({
    description:
      '조회할 서재 상태. "ALL" 또는 미지정 시 전체 상태를 반환 (MyBookStatus 값이 아니라 요청 전용 필터임)',
    enum: MyBookStatus,
  })
  @IsOptional()
  // 'ALL'은 MyBook.status의 실제 값이 아니라 "필터 없음"을 뜻하는 요청 전용 sentinel이라
  // 검증 전에 undefined로 치환해서 이후에는 기존 optional 필터 로직을 그대로 탄다.
  @Transform(({ value }: { value: unknown }) =>
    value === 'ALL' ? undefined : value,
  )
  @IsEnum(MyBookStatus, { message: '유효한 상태 값이 아닙니다.' })
  status?: MyBookStatus;

  @ApiPropertyOptional({
    description: '이 평점 이상만 조회 (0~5)',
    example: 4,
  })
  @IsOptional()
  @Type(() => Number) // Query String -> Number 변환
  @IsInt({ message: '평점은 정수여야 합니다.' })
  @Min(0, { message: '평점은 0 이상이어야 합니다.' })
  @Max(5, { message: '평점은 5 이하여야 합니다.' })
  minRating?: number;

  @ApiPropertyOptional({
    description: '한줄평 작성 여부로 필터링 (true: 작성함, false: 미작성)',
    example: true,
  })
  @IsOptional()
  // Query String은 'true'/'false' 문자열로 들어오므로, 값 그대로 boolean으로 치환한다.
  // @Type(() => Boolean)은 Boolean('false') === true라 오작동하므로 쓰지 않는다.
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'hasReview는 boolean 값이어야 합니다.' })
  hasReview?: boolean;

  @ApiPropertyOptional({
    description: '페이지 번호',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number) // Query String -> Number 변환
  @IsInt({ message: '페이지 번호는 정수여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number;

  @ApiPropertyOptional({
    description: '한 페이지에 보여질 항목 수',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number) // Query String -> Number 변환
  @IsInt({ message: '페이지당 항목 수는 정수여야 합니다.' })
  @Min(1, { message: '페이지당 항목 수는 1 이상이어야 합니다.' })
  limit?: number;
}
