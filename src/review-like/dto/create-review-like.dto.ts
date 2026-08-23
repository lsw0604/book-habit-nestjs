import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateReviewLikeDto {
  @ApiProperty({ description: '좋아요를 누를 MyBookReview ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  myBookReviewId: number;
}
