import type { JwtPayload } from '../auth/types';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ReadingLogService } from './reading-log.service';
import { CreateReadingLogDto } from './dto/create-reading-log.dto';
import { UpdateReadingLogDto } from './dto/update-reading-log.dto';
import {
  ReadingLogListResponseDto,
  ReadingLogResponseDto,
} from './dto/reading-log-response.dto';
import { FindReadingLogQueryDto } from './dto/find-reading-log.query.dto';
import {
  ApiCreatedResponseDto,
  ApiErrorResponse,
  ApiResponseDto,
  ApiUnauthorizedResponse,
  ApiVoidResponseDto,
} from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';

@ApiTags('ReadingLog')
@ApiAccessCookieAuth()
@UseGuards(AccessTokenGuard)
@Controller('reading-log')
export class ReadingLogController {
  constructor(private readonly readingLogService: ReadingLogService) {}

  @Post()
  @ApiOperation({
    summary: '독서 기록 생성',
    description:
      'readingMinutes는 startTime/endTime에서 서버가 계산한다(요청으로 보낼 수 없다). 첫 기록이면 MyBook이 WANT_TO_READ에서 CURRENTLY_READING으로 승격된다.',
  })
  @ApiCreatedResponseDto(ReadingLogResponseDto)
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    '미래 날짜 / 존재하지 않는 날짜 / endPage < startPage / endTime <= startTime / 페이지 상한 초과',
  )
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '서재 항목이 없거나 본인 것이 아님')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReadingLogDto) {
    return this.readingLogService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      '내 독서 기록 목록 조회 (myBookId 지정 시 해당 책만, from/to로 기간 필터, 페이지네이션)',
  })
  @ApiResponseDto(ReadingLogListResponseDto)
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    'from이 to보다 늦음 / 날짜 형식 오류',
  )
  @ApiUnauthorizedResponse()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindReadingLogQueryDto,
  ) {
    return this.readingLogService.findAll(user.sub, {
      myBookId: query.myBookId,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '독서 기록 단건 조회' })
  @ApiParam({ name: 'id', description: 'ReadingLog ID' })
  @ApiResponseDto(ReadingLogResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '기록이 없거나 본인 것이 아님')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingLogService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '독서 기록 수정',
    description:
      '부모 MyBook의 진행 상태를 같은 트랜잭션에서 재동기화한다. 재계산은 실제 최신 기록 기준이라 과거 기록을 고쳐도 진행률이 깨지지 않는다.',
  })
  @ApiParam({ name: 'id', description: 'ReadingLog ID' })
  @ApiResponseDto(ReadingLogResponseDto)
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    '미래 날짜 / 존재하지 않는 날짜 / endPage < startPage / endTime <= startTime / 페이지 상한 초과',
  )
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '기록이 없거나 본인 것이 아님')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReadingLogDto,
  ) {
    return this.readingLogService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '독서 기록 삭제' })
  @ApiParam({ name: 'id', description: 'ReadingLog ID' })
  @ApiVoidResponseDto('삭제됨')
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '기록이 없거나 본인 것이 아님')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingLogService.remove(user.sub, id);
  }
}
