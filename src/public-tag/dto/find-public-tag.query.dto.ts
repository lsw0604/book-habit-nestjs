import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { normalizeIsbn13 } from '../../common';
import {
  PUBLIC_TAG_DEFAULT_LIMIT,
  PUBLIC_TAG_MAX_LIMIT,
} from '../public-tag.constants';

export class FindPublicTagQueryDto {
  @ApiPropertyOptional({
    description:
      '이 책에 붙은 태그만 집계 (ISBN-10/13, 하이픈 허용 - ISBN-13으로 정규화됨). 미지정 시 전체 집계.',
    example: '9788996991342',
  })
  @IsOptional()
  // CreateMyBookDto와 같은 정규화 규칙. 잘못된 ISBN을 null이 아니라 false로 바꾸는 이유:
  // @IsOptional은 null도 "값 없음"으로 보고 검증을 건너뛰어서, 오타 ISBN이 400 대신
  // 조용히 전체 집계로 바뀌어 버린다.
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : (normalizeIsbn13(value) ?? false),
  )
  @IsString({ message: '유효한 ISBN이 아닙니다. (ISBN-10 또는 ISBN-13)' })
  isbn?: string;

  @ApiPropertyOptional({
    description: '상위 몇 개까지 반환할지',
    example: PUBLIC_TAG_DEFAULT_LIMIT,
    default: PUBLIC_TAG_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PUBLIC_TAG_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '반환 개수는 정수여야 합니다.' })
  @Min(1, { message: '반환 개수는 1 이상이어야 합니다.' })
  @Max(PUBLIC_TAG_MAX_LIMIT, {
    message: `반환 개수는 ${PUBLIC_TAG_MAX_LIMIT} 이하여야 합니다.`,
  })
  limit?: number;
}
