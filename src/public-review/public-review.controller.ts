import type { JwtPayload } from '../auth/types';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicReviewService } from './public-review.service';
import { FindPublicReviewQueryDto } from './dto/find-public-review.query.dto';
import {
  PublicReviewItemDto,
  PublicReviewListResponseDto,
} from './dto/public-review-response.dto';
import { ApiResponseDto } from '../common';
import { OptionalAccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('PublicReview')
@UseGuards(OptionalAccessTokenGuard)
@Controller('public-review')
export class PublicReviewController {
  constructor(private readonly publicReviewService: PublicReviewService) {}

  @Get()
  @ApiOperation({
    summary:
      '공개 한줄평 피드 조회 (비로그인도 조회 가능, 페이지네이션, isbn 지정 시 해당 책으로 필터링)',
  })
  @ApiResponseDto(PublicReviewListResponseDto)
  findAll(
    @CurrentUser() user: JwtPayload | undefined,
    @Query() query: FindPublicReviewQueryDto,
  ) {
    const { isbn, page = 1, limit = 10 } = query;
    return this.publicReviewService.findAll(user?.sub, isbn, {
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary:
      '공개 한줄평 단건 조회 (비로그인 조회 가능, 비공개 리뷰는 소유자여도 조회되지 않음)',
  })
  @ApiResponseDto(PublicReviewItemDto)
  findOne(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.publicReviewService.findOne(user?.sub, id);
  }
}
