import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { TagResponseDto } from './dto/tag-response.dto';
import { ApiResponseDto } from '../common';

@ApiTags('Tag')
@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: '태그 자동완성 검색' })
  @ApiQuery({ name: 'query', required: false, description: '검색어' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponseDto(TagResponseDto, { isArray: true })
  search(
    @Query('query') query?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    return this.tagService.search(query, limit);
  }
}
