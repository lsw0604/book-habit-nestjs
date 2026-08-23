import { ApiProperty } from '@nestjs/swagger';

export class ReviewLikeResponseDto {
  @ApiProperty({ description: 'ReviewLike ID', example: 1 })
  id: number;

  @ApiProperty({ description: '좋아요를 누른 User ID', example: 1 })
  userId: number;

  @ApiProperty({ description: '대상 MyBookReview ID', example: 1 })
  myBookReviewId: number;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;
}
