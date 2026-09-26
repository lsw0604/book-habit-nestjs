import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicTagService } from './public-tag.service';
import { FindPublicTagQueryDto } from './dto/find-public-tag.query.dto';
import { PublicTagItemDto } from './dto/public-tag-response.dto';
import { PUBLIC_TAG_DEFAULT_LIMIT } from './public-tag.constants';
import { ApiResponseDto } from '../common';

@ApiTags('PublicTag')
@Controller('public-tag')
export class PublicTagController {
  constructor(private readonly publicTagService: PublicTagService) {}

  @Get()
  @ApiOperation({
    summary:
      '인기 태그 집계 조회 (비로그인 조회 가능, 붙은 책 수 내림차순, 2명 이상이 쓴 태그만, isbn 지정 시 해당 책으로 필터링)',
  })
  @ApiResponseDto(PublicTagItemDto, { isArray: true })
  findPopular(@Query() query: FindPublicTagQueryDto) {
    return this.publicTagService.findPopular(
      query.limit ?? PUBLIC_TAG_DEFAULT_LIMIT,
      query.isbn,
    );
  }
}
