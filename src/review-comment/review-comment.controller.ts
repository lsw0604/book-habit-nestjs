import type { JwtPayload } from '../auth/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReviewCommentService } from './review-comment.service';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { UpdateReviewCommentDto } from './dto/update-review-comment.dto';
import { ReviewCommentResponseDto } from './dto/review-comment-response.dto';
import {
  ApiCreatedResponseDto,
  ApiErrorResponse,
  ApiResponseDto,
  ApiUnauthorizedResponse,
  ApiVoidResponseDto,
} from '../common';
import { AccessTokenGuard, OptionalAccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';

@ApiTags('ReviewComment')
@Controller('review-comment')
export class ReviewCommentController {
  constructor(private readonly reviewCommentService: ReviewCommentService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiAccessCookieAuth()
  @ApiOperation({
    summary: '한줄평에 댓글 작성',
    description: '공개된 한줄평이거나 본인 것이어야 한다. 최대 1000자.',
  })
  @ApiCreatedResponseDto(ReviewCommentResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '한줄평이 없거나 접근할 수 없음')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewCommentDto) {
    return this.reviewCommentService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({
    summary: '한줄평의 댓글 목록 조회 (비로그인 조회 가능)',
    description:
      '작성자는 author { id, name, profile }로 내려가고 원시 userId는 노출되지 않는다.',
  })
  @ApiQuery({
    name: 'myBookReviewId',
    type: Number,
    description: 'MyBookReview ID',
  })
  @ApiResponseDto(ReviewCommentResponseDto, { isArray: true })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '한줄평이 없거나 접근할 수 없음')
  findAll(
    @CurrentUser() user: JwtPayload | undefined,
    @Query('myBookReviewId', ParseIntPipe) myBookReviewId: number,
  ) {
    return this.reviewCommentService.findAll(user?.sub, myBookReviewId);
  }

  @Get(':id')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: '댓글 단건 조회 (비로그인 조회 가능)' })
  @ApiParam({ name: 'id', description: 'ReviewComment ID' })
  @ApiResponseDto(ReviewCommentResponseDto)
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '댓글이 없거나 접근할 수 없음')
  findOne(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewCommentService.findOne(user?.sub, id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiAccessCookieAuth()
  @ApiOperation({ summary: '댓글 수정' })
  @ApiParam({ name: 'id', description: 'ReviewComment ID' })
  @ApiResponseDto(ReviewCommentResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '댓글이 없거나 본인 것이 아님')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewCommentDto,
  ) {
    return this.reviewCommentService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiAccessCookieAuth()
  @ApiOperation({ summary: '댓글 삭제' })
  @ApiParam({ name: 'id', description: 'ReviewComment ID' })
  @ApiVoidResponseDto('삭제됨')
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '댓글이 없거나 본인 것이 아님')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reviewCommentService.remove(user.sub, id);
  }
}
