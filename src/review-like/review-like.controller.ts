import type { JwtPayload } from '../auth/types';
import {
  Body,
  Controller,
  Delete,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReviewLikeService } from './review-like.service';
import { CreateReviewLikeDto } from './dto/create-review-like.dto';
import { ReviewLikeResponseDto } from './dto/review-like-response.dto';
import {
  ApiCreatedResponseDto,
  ApiErrorResponse,
  ApiUnauthorizedResponse,
  ApiVoidResponseDto,
} from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';

@ApiTags('ReviewLike')
@ApiAccessCookieAuth()
@UseGuards(AccessTokenGuard)
@Controller('review-like')
export class ReviewLikeController {
  constructor(private readonly reviewLikeService: ReviewLikeService) {}

  @Post()
  @ApiOperation({
    summary: '한줄평 좋아요',
    description:
      '공개된 한줄평이거나 본인 것이어야 한다. 비공개로 바뀐 글은 새 좋아요만 막히고 기존 좋아요는 남는다.',
  })
  @ApiCreatedResponseDto(ReviewLikeResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '한줄평이 없거나 접근할 수 없음')
  @ApiErrorResponse(HttpStatus.CONFLICT, '이미 좋아요를 누름')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewLikeDto) {
    return this.reviewLikeService.create(user.sub, dto);
  }

  @Delete()
  @ApiOperation({
    summary: '한줄평 좋아요 취소',
    description: '대상을 경로 id가 아니라 쿼리 myBookReviewId로 지정한다.',
  })
  @ApiVoidResponseDto('좋아요 취소됨')
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '누른 좋아요가 없음')
  @ApiQuery({
    name: 'myBookReviewId',
    type: Number,
    description: 'MyBookReview ID',
  })
  remove(
    @CurrentUser() user: JwtPayload,
    @Query('myBookReviewId', ParseIntPipe) myBookReviewId: number,
  ) {
    return this.reviewLikeService.remove(user.sub, myBookReviewId);
  }
}
