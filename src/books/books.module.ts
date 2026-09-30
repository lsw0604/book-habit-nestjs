import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { BookLookupService } from './book-lookup.service';
import { KakaoBookSearchService, NlBookSearchService } from './providers';

@Module({
  imports: [HttpModule.register({ timeout: 3000, maxRedirects: 2 })],
  providers: [
    BooksService,
    BookLookupService,
    KakaoBookSearchService,
    NlBookSearchService,
  ],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}
