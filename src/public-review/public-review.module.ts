import { Module } from '@nestjs/common';
import { PublicReviewService } from './public-review.service';
import { PublicReviewController } from './public-review.controller';

@Module({
  controllers: [PublicReviewController],
  providers: [PublicReviewService],
})
export class PublicReviewModule {}
