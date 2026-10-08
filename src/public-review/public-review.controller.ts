import type { JwtPayload } from '../auth/types';
import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PublicReviewService } from './public-review.service';
import { FindPublicReviewQueryDto } from './dto/find-public-review.query.dto';
import {
  PublicReviewItemDto,
  PublicReviewListResponseDto,
} from './dto/public-review-response.dto';
import { ApiErrorResponse, ApiResponseDto } from '../common';
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
  @ApiResponseDto(PublicReviewListResponseDto, {
    description:
      'isLiked는 요청자 기준이며 비로그인은 항상 false. myBookId·isPublic은 내려가지 않는다.',
  })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, '유효하지 않은 isbn')
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
  @ApiParam({ name: 'id', description: 'MyBookReview ID' })
  @ApiResponseDto(PublicReviewItemDto)
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    '공개된 한줄평이 없음 (비공개 글은 작성자 본인에게도 404 — GET /my-book-review/:id 사용)',
  )
  findOne(
    @CurrentUser() user: JwtPayload | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.publicReviewService.findOne(user?.sub, id);
  }
}
