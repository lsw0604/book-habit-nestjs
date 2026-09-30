import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../common';
import { BooksService } from './books.service';
import { BookDetailResDto } from './dto/book-detail-res.dto';
import { BookIsbnParamDto } from './dto/book-isbn.param.dto';
import {
  KakaoBookSearchService,
  KakaoSearchReqDto,
  KakaoSearchResultDto,
} from './providers';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(
    private readonly kakaoBookSearchService: KakaoBookSearchService,
    private readonly booksService: BooksService,
  ) {}

  @Get()
  @ApiOperation({ summary: '카카오 도서 검색' })
  @ApiResponseDto(KakaoSearchResultDto)
  search(
    @Query() queryParams: KakaoSearchReqDto,
  ): Promise<KakaoSearchResultDto> {
    return this.kakaoBookSearchService.search(queryParams);
  }

  @Get('detail/:isbn')
  @ApiOperation({
    summary: 'ISBN으로 도서 상세 조회',
    description:
      'DB에 있으면 그 값을, 없으면 외부 API에서 조회해 돌려준다. 조회만 하며 저장하지 않는다(Book은 서재 등록 때만 저장).',
  })
  @ApiResponseDto(BookDetailResDto)
  detail(@Param() { isbn }: BookIsbnParamDto): Promise<BookDetailResDto> {
    return this.booksService.findDetailByIsbn(isbn);
  }
}
