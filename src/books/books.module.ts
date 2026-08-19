import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { KakaoBookSearchService, AladinBookSearchService } from './providers';

@Module({
  imports: [HttpModule],
  providers: [BooksService, KakaoBookSearchService, AladinBookSearchService],
  controllers: [BooksController],
})
export class BooksModule {}
