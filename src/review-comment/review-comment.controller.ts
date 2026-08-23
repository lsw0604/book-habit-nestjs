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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReviewCommentService } from './review-comment.service';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { UpdateReviewCommentDto } from './dto/update-review-comment.dto';
import { ReviewCommentResponseDto } from './dto/review-comment-response.dto';
import { ApiResponseDto } from '../common';
import { AccessTokenGuard, OptionalAccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('ReviewComment')
@Controller('review-comment')
export class ReviewCommentController {
  constructor(private readonly reviewCommentService: ReviewCommentService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '한줄평에 댓글 작성' })
  @ApiResponseDto(ReviewCommentResponseDto)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewCommentDto) {
    return this.reviewCommentService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: '한줄평의 댓글 목록 조회 (비로그인 조회 가능)' })
  @ApiQuery({
    name: 'myBookReviewId',
    type: Number,
    description: 'MyBookReview ID',
  })
  @ApiResponseDto(ReviewCommentResponseDto, { isArray: true })
  findAll(
    @CurrentUser() user: JwtPayload | undefined,
    @Query('myBookReviewId', ParseIntPipe) myBookReviewId: number,
  ) {
    return this.reviewCommentService.findAll(user?.sub, myBookReviewId);
  }

  @Get(':id')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: '댓글 단건 조회 (비로그인 조회 가능)' })
  @ApiResponseDto(ReviewCommentResponseDto)
  findOne(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewCommentService.findOne(user?.sub, id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '댓글 수정' })
  @ApiResponseDto(ReviewCommentResponseDto)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewCommentDto,
  ) {
    return this.reviewCommentService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '댓글 삭제' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewCommentService.remove(user.sub, id);
  }
}
