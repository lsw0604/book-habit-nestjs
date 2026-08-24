import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateReviewCommentDto } from './create-review-comment.dto';

export class UpdateReviewCommentDto extends PartialType(
  OmitType(CreateReviewCommentDto, ['myBookReviewId'] as const),
) {}
