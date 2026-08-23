import { Module } from '@nestjs/common';
import { MyBookReviewService } from './my-book-review.service';
import { MyBookReviewController } from './my-book-review.controller';

@Module({
  controllers: [MyBookReviewController],
  providers: [MyBookReviewService],
  exports: [MyBookReviewService],
})
export class MyBookReviewModule {}
