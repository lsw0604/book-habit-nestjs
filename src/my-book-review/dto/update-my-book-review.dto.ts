import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMyBookReviewDto } from './create-my-book-review.dto';

export class UpdateMyBookReviewDto extends PartialType(
  OmitType(CreateMyBookReviewDto, ['myBookId'] as const),
) {}
