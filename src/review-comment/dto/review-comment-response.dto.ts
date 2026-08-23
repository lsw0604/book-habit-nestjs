import { ApiProperty } from '@nestjs/swagger';

export class ReviewCommentResponseDto {
  @ApiProperty({ description: 'ReviewComment ID', example: 1 })
  id: number;

  @ApiProperty({ description: '대상 MyBookReview ID', example: 1 })
  myBookReviewId: number;

  @ApiProperty({ description: '작성자 User ID', example: 1 })
  userId: number;

  @ApiProperty({
    description: '댓글 내용',
    example: '저도 인상 깊게 읽었어요!',
  })
  comment: string;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각', type: Date })
  updatedAt: Date;
}
