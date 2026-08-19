import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  AladinBookSearchService,
  KakaoBookSearchService,
  KakaoSearchReqDto,
} from './providers';

@Controller('books')
export class BooksController {
  constructor(
    private readonly kakaoBookSearchService: KakaoBookSearchService,
    private readonly aladinBookSearchService: AladinBookSearchService,
  ) {}

  @Get()
  search(@Query() queryParams: KakaoSearchReqDto) {
    return this.kakaoBookSearchService.search(queryParams);
  }

  @Get('detail/:isbn')
  detail(@Param('isbn') isbn: string) {
    return this.aladinBookSearchService.getByIsbn(isbn);
  }
}
