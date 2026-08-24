import type { JwtPayload } from '../auth/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MyBookReviewService } from './my-book-review.service';
import { CreateMyBookReviewDto } from './dto/create-my-book-review.dto';
import { UpdateMyBookReviewDto } from './dto/update-my-book-review.dto';
import { FindMyBookReviewQueryDto } from './dto/find-my-book-review.query.dto';
import {
  MyBookReviewListResponseDto,
  MyBookReviewResponseDto,
} from './dto/my-book-review-response.dto';
import { ApiResponseDto } from '../common';
import { AccessTokenGuard, OptionalAccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('MyBookReview')
@Controller('my-book-review')
export class MyBookReviewController {
  constructor(private readonly myBookReviewService: MyBookReviewService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '한줄평 작성 (MyBook당 1개)' })
  @ApiResponseDto(MyBookReviewResponseDto)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMyBookReviewDto) {
    return this.myBookReviewService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary:
      '내가 작성한 한줄평 목록 조회 (책/공개여부 무관하게 전부, 페이지네이션)',
  })
  @ApiResponseDto(MyBookReviewListResponseDto)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindMyBookReviewQueryDto,
  ) {
    const { page = 1, limit = 10 } = query;
    return this.myBookReviewService.findAll(user.sub, { page, limit });
  }

  @Get('liked')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary:
      '내가 좋아요 누른 한줄평 목록 (접근 가능한 것만 — 좋아요 이후 비공개로 바뀐 남의 글은 제외)',
  })
  @ApiResponseDto(MyBookReviewListResponseDto)
  findLiked(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindMyBookReviewQueryDto,
  ) {
    const { page = 1, limit = 10 } = query;
    return this.myBookReviewService.findLiked(user.sub, { page, limit });
  }

  @Get('commented')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: '내가 댓글단 한줄평 목록 (접근 가능한 것만, 리뷰당 1건)',
  })
  @ApiResponseDto(MyBookReviewListResponseDto)
  findCommented(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindMyBookReviewQueryDto,
  ) {
    const { page = 1, limit = 10 } = query;
    return this.myBookReviewService.findCommented(user.sub, { page, limit });
  }

  @Get(':id')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({
    summary: '한줄평 단건 조회 (공개 리뷰이거나 본인 것만, 비로그인 조회 가능)',
  })
  @ApiResponseDto(MyBookReviewResponseDto)
  findOne(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myBookReviewService.findOne(user?.sub, id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '한줄평 수정' })
  @ApiResponseDto(MyBookReviewResponseDto)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMyBookReviewDto,
  ) {
    return this.myBookReviewService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '한줄평 삭제' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myBookReviewService.remove(user.sub, id);
  }
}
