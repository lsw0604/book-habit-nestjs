import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class FindPublicReviewQueryDto {
  @ApiPropertyOptional({
    description:
      'ISBN으로 필터링 (숫자 13자리, 하이픈 등 자동 제거됨) — 미지정 시 전체 공개 한줄평 피드. ' +
      '내부 Book ID가 아니라 ISBN을 쓰는 이유: 클라이언트가 책 상세를 열 때 아는 값은 ISBN뿐이고, Book ID는 어떤 응답에도 노출되지 않는다.',
    example: '9788996991342',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string | undefined }) =>
    value === undefined ? value : value.replace(/[^0-9]/g, ''),
  )
  @Matches(/^\d{13}$/, { message: 'ISBN은 숫자 13자리여야 합니다.' })
  isbn?: string;

  @ApiPropertyOptional({ description: '페이지 번호', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '페이지 번호는 정수여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number;

  @ApiPropertyOptional({
    description: '한 페이지에 보여질 항목 수',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '페이지당 항목 수는 정수여야 합니다.' })
  @Min(1, { message: '페이지당 항목 수는 1 이상이어야 합니다.' })
  limit?: number;
}
