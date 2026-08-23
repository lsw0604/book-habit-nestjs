import { Module } from '@nestjs/common';
import { ReviewCommentService } from './review-comment.service';
import { ReviewCommentController } from './review-comment.controller';
import { MyBookReviewModule } from '../my-book-review/my-book-review.module';

@Module({
  imports: [MyBookReviewModule],
  controllers: [ReviewCommentController],
  providers: [ReviewCommentService],
})
export class ReviewCommentModule {}
