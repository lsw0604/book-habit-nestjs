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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MyBookReviewService } from './my-book-review.service';
import { CreateMyBookReviewDto } from './dto/create-my-book-review.dto';
import { UpdateMyBookReviewDto } from './dto/update-my-book-review.dto';
import { FindMyBookReviewQueryDto } from './dto/find-my-book-review.query.dto';
import {
  MyBookReviewListResponseDto,
  MyBookReviewResponseDto,
} from './dto/my-book-review-response.dto';
import {
  ApiCreatedResponseDto,
  ApiErrorResponse,
  ApiResponseDto,
  ApiUnauthorizedResponse,
  ApiVoidResponseDto,
} from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';

const REVIEW_NOT_FOUND = '한줄평이 없거나 본인 것이 아님';

@ApiTags('MyBookReview')
@ApiAccessCookieAuth()
@Controller('my-book-review')
export class MyBookReviewController {
  constructor(private readonly myBookReviewService: MyBookReviewService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '한줄평 작성 (MyBook당 1개)' })
  @ApiCreatedResponseDto(MyBookReviewResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '서재 항목이 없거나 본인 것이 아님')
  @ApiErrorResponse(HttpStatus.CONFLICT, '이미 작성된 한줄평이 있음')
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
  @ApiUnauthorizedResponse()
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
  @ApiUnauthorizedResponse()
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
  @ApiUnauthorizedResponse()
  findCommented(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindMyBookReviewQueryDto,
  ) {
    const { page = 1, limit = 10 } = query;
    return this.myBookReviewService.findCommented(user.sub, { page, limit });
  }

  // ':id'(ParseIntPipe)보다 세그먼트가 하나 더 많아 라우트가 겹치지 않는다
  // (MyBookController의 'by-isbn/:isbn'과 같은 패턴).
  @Get('by-my-book/:myBookId')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'MyBook ID로 그 책의 한줄평 조회',
    description:
      '경로 식별자가 MyBookReview.id가 아니라 MyBookId다. MyBook당 한줄평이 1개라서(myBookId unique) 상위 리소스 식별자로 유일한 자식을 찾는다. 아직 쓰지 않았으면 data는 null.',
  })
  @ApiParam({ name: 'myBookId', description: 'MyBook ID (한줄평 ID가 아니다)' })
  @ApiResponseDto(MyBookReviewResponseDto, {
    description: '한줄평을 쓰지 않았거나 남의 서재 항목이면 data는 null',
  })
  @ApiUnauthorizedResponse()
  findByMyBookId(
    @CurrentUser() user: JwtPayload,
    @Param('myBookId', ParseIntPipe) myBookId: number,
  ) {
    return this.myBookReviewService.findByMyBookId(user.sub, myBookId);
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary:
      '내가 작성한 한줄평 단건 조회 (남의 공개 한줄평은 GET /public-review/:id 사용)',
  })
  @ApiParam({
    name: 'id',
    description: 'MyBookReview ID (MyBook ID가 아니다 — by-my-book 참고)',
  })
  @ApiResponseDto(MyBookReviewResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, REVIEW_NOT_FOUND)
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myBookReviewService.findOne(user.sub, id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '한줄평 수정' })
  @ApiParam({ name: 'id', description: 'MyBookReview ID' })
  @ApiResponseDto(MyBookReviewResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, REVIEW_NOT_FOUND)
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
  @ApiParam({ name: 'id', description: 'MyBookReview ID' })
  @ApiVoidResponseDto('삭제됨')
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, REVIEW_NOT_FOUND)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myBookReviewService.remove(user.sub, id);
  }
}
