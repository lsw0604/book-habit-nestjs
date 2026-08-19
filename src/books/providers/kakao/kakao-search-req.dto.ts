import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class KakaoSearchReqDto {
  @ApiProperty({
    description: '검색어',
    example: '미움받을 용기',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: '검색어는 필수 입력값입니다.' })
  query: string;

  @ApiPropertyOptional({
    description: '정렬 방식 (accuracy: 정확도순, latest: 최신순)',
    enum: ['accuracy', 'latest'],
    default: 'accuracy',
  })
  @IsOptional()
  @IsEnum(['accuracy', 'latest'], {
    message: '정렬 방식은 accuracy 또는 latest 중 하나여야 합니다.',
  })
  sort?: 'accuracy' | 'latest';

  @ApiPropertyOptional({
    description: '결과 페이지 번호 (1~50)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number) // Query String -> Number 변환
  @IsInt({ message: '페이지 번호는 정수여야 합니다.' })
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  @Max(50, { message: '페이지 번호는 50 이하여야 합니다.' })
  page?: number;

  @ApiPropertyOptional({
    description: '한 페이지에 보여질 문서 수 (1~50)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number) // Query String -> Number 변환
  @IsInt({ message: '페이지당 결과 수는 정수여야 합니다.' })
  @Min(1, { message: '페이지당 결과 수는 1 이상이어야 합니다.' })
  @Max(50, { message: '페이지당 결과 수는 50 이하여야 합니다.' })
  size?: number;

  @ApiPropertyOptional({
    description: '검색 대상 필드 제한',
    enum: ['title', 'isbn', 'publisher', 'person'],
    example: 'title',
  })
  @IsOptional()
  @IsEnum(['title', 'isbn', 'publisher', 'person'], {
    message: '검색 대상은 title, isbn, publisher, person 중 하나여야 합니다.',
  })
  target?: 'title' | 'isbn' | 'publisher' | 'person';
}
