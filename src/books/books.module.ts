import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { KakaoBookSearchService, AladinBookSearchService } from './providers';

@Module({
  imports: [HttpModule.register({ timeout: 3000, maxRedirects: 2 })],
  providers: [BooksService, KakaoBookSearchService, AladinBookSearchService],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}
