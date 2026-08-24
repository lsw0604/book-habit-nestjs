import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateReviewCommentDto {
  @ApiProperty({ description: '댓글을 달 MyBookReview ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  myBookReviewId: number;

  @ApiProperty({
    description: '댓글 내용 (최대 1000자)',
    example: '저도 인상 깊게 읽었어요!',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: '댓글은 필수 입력값입니다.' })
  @MaxLength(1000, { message: '댓글은 1000자를 초과할 수 없습니다.' })
  comment: string;
}
