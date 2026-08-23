import { Module } from '@nestjs/common';
import { ReviewLikeService } from './review-like.service';
import { ReviewLikeController } from './review-like.controller';
import { MyBookReviewModule } from '../my-book-review/my-book-review.module';

@Module({
  imports: [MyBookReviewModule],
  controllers: [ReviewLikeController],
  providers: [ReviewLikeService],
})
export class ReviewLikeModule {}
