import { Module } from '@nestjs/common';
import { MyBookReviewService } from './my-book-review.service';
import { MyBookReviewController } from './my-book-review.controller';
import { MyBookModule } from '../my-book/my-book.module';

@Module({
  imports: [MyBookModule],
  controllers: [MyBookReviewController],
  providers: [MyBookReviewService],
  exports: [MyBookReviewService],
})
export class MyBookReviewModule {}
