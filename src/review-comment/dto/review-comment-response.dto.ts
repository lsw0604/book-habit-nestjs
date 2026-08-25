import { ApiProperty } from '@nestjs/swagger';

export class ReviewCommentAuthorDto {
  @ApiProperty({ description: '작성자 User ID', example: 1 })
  id: number;

  @ApiProperty({ description: '작성자 이름', nullable: true })
  name: string | null;

  @ApiProperty({ description: '작성자 프로필 이미지 URL', nullable: true })
  profile: string | null;
}

export class ReviewCommentResponseDto {
  @ApiProperty({ description: 'ReviewComment ID', example: 1 })
  id: number;

  @ApiProperty({ description: '대상 MyBookReview ID', example: 1 })
  myBookReviewId: number;

  @ApiProperty({
    description: '댓글 내용',
    example: '저도 인상 깊게 읽었어요!',
  })
  comment: string;

  // 내 댓글인지(수정/삭제 버튼 노출 여부)는 author.id로 판별한다 - 그래서 raw userId는 내리지 않는다.
  @ApiProperty({ description: '작성자 정보', type: ReviewCommentAuthorDto })
  author: ReviewCommentAuthorDto;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각', type: Date })
  updatedAt: Date;
}
