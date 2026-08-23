import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MyBookService } from './my-book.service';
import { CreateMyBookDto } from './dto/create-my-book.dto';
import { UpdateMyBookDto } from './dto/update-my-book.dto';
import { FindMyBookQueryDto } from './dto/find-my-book.query.dto';
import {
  MyBookListResponseDto,
  MyBookResponseDto,
} from './dto/my-book-response.dto';
import { ApiResponseDto } from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/types';

@ApiTags('MyBook')
@UseGuards(AccessTokenGuard)
@Controller('my-book')
export class MyBookController {
  constructor(private readonly myBookService: MyBookService) {}

  @Post()
  @ApiOperation({ summary: '서재에 책 등록' })
  @ApiResponseDto(MyBookResponseDto)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createMyBookDto: CreateMyBookDto,
  ) {
    return this.myBookService.create(user.sub, createMyBookDto);
  }

  @Get()
  @ApiOperation({
    summary: '서재 목록 조회 (상태/평점/리뷰 여부 필터, 페이지네이션)',
  })
  @ApiResponseDto(MyBookListResponseDto)
  findAll(@CurrentUser() user: JwtPayload, @Query() query: FindMyBookQueryDto) {
    const { status, minRating, hasReview, page = 1, limit = 10 } = query;
    return this.myBookService.findAll(user.sub, status, {
      page,
      limit,
      minRating,
      hasReview,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '서재 항목 단건 조회' })
  @ApiResponseDto(MyBookResponseDto)
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myBookService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '서재 항목 수정 (상태 전환/평점/진행 페이지)' })
  @ApiResponseDto(MyBookResponseDto)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMyBookDto: UpdateMyBookDto,
  ) {
    return this.myBookService.update(user.sub, id, updateMyBookDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '서재 항목 삭제' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myBookService.remove(user.sub, id);
  }
}
