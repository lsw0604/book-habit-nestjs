import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from '../../../common';
import { KakaoBookItemDto } from './kakao-search-res.dto';

export class KakaoSearchResultDto {
  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ type: [KakaoBookItemDto] })
  items: KakaoBookItemDto[];
}
