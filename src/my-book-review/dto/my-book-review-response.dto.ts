import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta, PaginationResponse } from '../../common/pagination';

export class MyBookReviewCountDto {
  @ApiProperty({ description: '좋아요 수', example: 3 })
  reviewLike: number;

  @ApiProperty({ description: '댓글 수', example: 2 })
  reviewComment: number;
}

export class MyBookReviewResponseDto {
  @ApiProperty({ description: 'MyBookReview ID', example: 1 })
  id: number;

  @ApiProperty({ description: '연결된 MyBook ID', example: 1 })
  myBookId: number;

  @ApiProperty({ description: '한줄평', example: '올해 읽은 책 중 최고였다.' })
  review: string;

  @ApiProperty({ description: '공개 여부', example: true })
  isPublic: boolean;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각', type: Date })
  updatedAt: Date;

  @ApiProperty({ description: '연관 데이터 개수', type: MyBookReviewCountDto })
  _count: MyBookReviewCountDto;
}

export class MyBookReviewListBookDto {
  @ApiProperty({ description: '책 제목', example: '미움받을 용기' })
  title: string;

  @ApiProperty({ description: '썸네일 이미지 URL', nullable: true })
  thumbnail: string | null;
}

export class MyBookReviewListItemDto {
  @ApiProperty({ description: 'MyBookReview ID', example: 1 })
  id: number;

  @ApiProperty({ description: '연결된 MyBook ID', example: 1 })
  myBookId: number;

  @ApiProperty({ description: '한줄평', example: '올해 읽은 책 중 최고였다.' })
  review: string;

  @ApiProperty({ description: '공개 여부', example: true })
  isPublic: boolean;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '책 정보', type: MyBookReviewListBookDto })
  book: MyBookReviewListBookDto;

  @ApiProperty({ description: '연관 데이터 개수', type: MyBookReviewCountDto })
  _count: MyBookReviewCountDto;
}

export class MyBookReviewListResponseDto implements PaginationResponse<
  MyBookReviewListItemDto,
  'items'
> {
  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ type: [MyBookReviewListItemDto] })
  items: MyBookReviewListItemDto[];
}
