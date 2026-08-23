import type { JwtPayload } from '../auth/types';
import {
  Body,
  Controller,
  Delete,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReviewLikeService } from './review-like.service';
import { CreateReviewLikeDto } from './dto/create-review-like.dto';
import { ReviewLikeResponseDto } from './dto/review-like-response.dto';
import { ApiResponseDto } from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('ReviewLike')
@UseGuards(AccessTokenGuard)
@Controller('review-like')
export class ReviewLikeController {
  constructor(private readonly reviewLikeService: ReviewLikeService) {}

  @Post()
  @ApiOperation({ summary: '한줄평 좋아요' })
  @ApiResponseDto(ReviewLikeResponseDto)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewLikeDto) {
    return this.reviewLikeService.create(user.sub, dto);
  }

  @Delete()
  @ApiOperation({ summary: '한줄평 좋아요 취소' })
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
