import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { TagResponseDto } from './dto/tag-response.dto';
import { ApiErrorResponse, ApiResponseDto } from '../common';

@ApiTags('Tag')
@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({
    summary: '태그 자동완성 검색 (완성형 문자열과 초성 입력 모두 매칭)',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description:
      '검색어. 완성형 문자열("자기계발")과 초성("ㅈㄱㄱㅂ") 모두 가능. 생략하면 전체 태그를 limit만큼 돌려준다(검색 전용이 아니라 목록 겸용)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '최대 반환 개수',
    example: 10,
    schema: { default: 10 },
  })
  @ApiResponseDto(TagResponseDto, { isArray: true })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'limit이 정수가 아님')
  search(
    @Query('query') query?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    return this.tagService.search(query, limit);
  }
}
