import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BooksModule } from './books/books.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseDtoInterceptor, ResponseExceptionFilter } from './common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MyBookModule } from './my-book/my-book.module';
import { ReadingLogModule } from './reading-log/reading-log.module';
import { MyBookReviewModule } from './my-book-review/my-book-review.module';
import { ReviewLikeModule } from './review-like/review-like.module';
import { ReviewCommentModule } from './review-comment/review-comment.module';
import { PublicReviewModule } from './public-review/public-review.module';
import { TagModule } from './tag/tag.module';
import { MyBookTagModule } from './my-book-tag/my-book-tag.module';
import { QuoteModule } from './quote/quote.module';
import { ReadingGoalModule } from './reading-goal/reading-goal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BooksModule,
    UserModule,
    AuthModule,
    MyBookModule,
    ReadingLogModule,
    MyBookReviewModule,
    ReviewLikeModule,
    ReviewCommentModule,
    PublicReviewModule,
    TagModule,
    MyBookTagModule,
    QuoteModule,
    ReadingGoalModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseDtoInterceptor },
    { provide: APP_FILTER, useClass: ResponseExceptionFilter },
    AppService,
  ],
})
export class AppModule {}
