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
import { MyBookIsbnParamDto } from './dto/my-book-isbn.param.dto';
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

  // 개인 서재는 항목 수가 작아(수백~1천 권 내외) 클라이언트가 실질적으로
  // 페이지네이션을 쓰지 않고 한 번에 전체를 받는 걸 전제로 limit 기본값을
  // 크게 잡아뒀다(FindMyBookQueryDto 참고). page/limit/meta 자체는 나중에
  // 정말 필요해질 경우를 대비해 남겨둔 것.
  @Get()
  @ApiOperation({
    summary: '서재 목록 조회 (상태/평점/리뷰 여부 필터, 정렬)',
  })
  @ApiResponseDto(MyBookListResponseDto)
  findAll(@CurrentUser() user: JwtPayload, @Query() query: FindMyBookQueryDto) {
    // page/limit/order의 기본값은 FindMyBookQueryDto 필드 초기값이 유일한
    // 소스다 - 여기서 또 기본값을 주면 Swagger 문서와 실제 동작이 따로 놀 수 있다.
    const { status, minRating, hasReview, page, limit, order } = query;
    return this.myBookService.findAll(user.sub, status, {
      page,
      limit,
      minRating,
      hasReview,
      order,
    });
  }

  // ':id'(ParseIntPipe)보다 세그먼트가 하나 더 많아 라우트가 겹치지 않는다.
  @Get('by-isbn/:isbn')
  @ApiOperation({ summary: 'ISBN으로 내 서재 등록 여부 조회' })
  @ApiResponseDto(MyBookResponseDto, {
    description: '해당 책이 서재에 없으면 data는 null',
  })
  findByIsbn(
    @CurrentUser() user: JwtPayload,
    @Param() { isbn }: MyBookIsbnParamDto,
  ) {
    return this.myBookService.findByIsbn(user.sub, isbn);
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
