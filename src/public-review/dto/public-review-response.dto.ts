import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta, PaginationResponse } from '../../common/pagination';
import { MyBookReviewCountDto } from '../../my-book-review/dto/my-book-review-response.dto';

export class PublicReviewAuthorDto {
  @ApiProperty({ description: '작성자 User ID', example: 1 })
  id: number;

  @ApiProperty({ description: '작성자 이름', nullable: true })
  name: string | null;

  @ApiProperty({ description: '작성자 프로필 이미지 URL', nullable: true })
  profile: string | null;
}

/** 공개 한줄평 항목. 목록(items)과 단건 조회가 같은 형태를 공유한다. */
export class PublicReviewItemDto {
  @ApiProperty({ description: 'MyBookReview ID', example: 1 })
  id: number;

  @ApiProperty({ description: '한줄평', example: '올해 읽은 책 중 최고였다.' })
  review: string;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '작성자 정보', type: PublicReviewAuthorDto })
  author: PublicReviewAuthorDto;

  @ApiProperty({ description: '연관 데이터 개수', type: MyBookReviewCountDto })
  _count: MyBookReviewCountDto;

  @ApiProperty({
    description: '요청자가 좋아요를 눌렀는지 여부',
    example: false,
  })
  isLiked: boolean;
}

export class PublicReviewListResponseDto implements PaginationResponse<
  PublicReviewItemDto,
  'items'
> {
  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ type: [PublicReviewItemDto] })
  items: PublicReviewItemDto[];
}
