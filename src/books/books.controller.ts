import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponse, ApiResponseDto } from '../common';
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
  @ApiOperation({
    summary: '카카오 도서 검색',
    description:
      '일회성 후보 목록이며 Book 레코드가 아니다. ISSN·판별 불가 항목은 걸러내지 않고 identifierType으로 표시한다(isbn이 null이면 서재에 등록할 수 없다).',
  })
  @ApiResponseDto(KakaoSearchResultDto)
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    'query 누락 또는 page/size 범위 초과',
  )
  @ApiErrorResponse(HttpStatus.BAD_GATEWAY, '카카오 API 호출 실패')
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
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, '유효하지 않은 ISBN')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '해당 ISBN의 책을 찾을 수 없음')
  @ApiErrorResponse(HttpStatus.BAD_GATEWAY, '외부 조회 실패')
  detail(@Param() { isbn }: BookIsbnParamDto): Promise<BookDetailResDto> {
    return this.booksService.findDetailByIsbn(isbn);
  }
}
