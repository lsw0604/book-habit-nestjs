import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../common';
import {
  AladinBookSearchService,
  AladinLookupResDto,
  KakaoBookSearchService,
  KakaoSearchReqDto,
  KakaoSearchResultDto,
} from './providers';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(
    private readonly kakaoBookSearchService: KakaoBookSearchService,
    private readonly aladinBookSearchService: AladinBookSearchService,
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
  @ApiOperation({ summary: '알라딘 ISBN 단건 조회' })
  @ApiResponseDto(AladinLookupResDto)
  detail(@Param('isbn') isbn: string): Promise<AladinLookupResDto> {
    return this.aladinBookSearchService.getByIsbn(isbn);
  }
}
