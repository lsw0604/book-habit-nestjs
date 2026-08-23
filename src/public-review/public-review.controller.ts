import type { JwtPayload } from '../auth/types';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicReviewService } from './public-review.service';
import { FindPublicReviewQueryDto } from './dto/find-public-review.query.dto';
import { PublicReviewListResponseDto } from './dto/public-review-response.dto';
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
}
