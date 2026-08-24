import type { JwtPayload } from '../auth/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MyBookTagService } from './my-book-tag.service';
import { CreateMyBookTagDto } from './dto/create-my-book-tag.dto';
import { MyBookTagResponseDto } from './dto/my-book-tag-response.dto';
import { ApiResponseDto } from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('MyBookTag')
@UseGuards(AccessTokenGuard)
@Controller('my-book-tag')
export class MyBookTagController {
  constructor(private readonly myBookTagService: MyBookTagService) {}

  @Post()
  @ApiOperation({ summary: '서재 항목에 태그 추가' })
  @ApiResponseDto(MyBookTagResponseDto)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMyBookTagDto) {
    return this.myBookTagService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '특정 서재 항목의 태그 목록 조회' })
  @ApiQuery({ name: 'myBookId', type: Number, description: 'MyBook ID' })
  @ApiResponseDto(MyBookTagResponseDto, { isArray: true })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('myBookId', ParseIntPipe) myBookId: number,
  ) {
    return this.myBookTagService.findAll(user.sub, myBookId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '서재 항목에서 태그 제거' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myBookTagService.remove(user.sub, id);
  }
}
