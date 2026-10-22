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
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { FindQuoteQueryDto } from './dto/find-quote.query.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';
import {
  ApiCreatedResponseDto,
  ApiErrorResponse,
  ApiResponseDto,
  ApiUnauthorizedResponse,
  ApiVoidResponseDto,
} from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';

@ApiTags('Quote')
@ApiAccessCookieAuth()
@UseGuards(AccessTokenGuard)
@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @ApiOperation({ summary: '인용구 생성' })
  @ApiCreatedResponseDto(QuoteResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    '페이지가 이 책의 총 페이지 수를 초과함',
  )
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    '서재 항목이 없거나 본인 것이 아님, 또는 readingLogId가 이 책의 독서 기록이 아님',
  )
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuoteDto) {
    return this.quoteService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({
    summary: '책의 인용구 목록 조회 (페이지순, readingLogId로 좁힐 수 있음)',
  })
  @ApiResponseDto(QuoteResponseDto, { isArray: true })
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '서재 항목이 없거나 본인 것이 아님')
  findAll(@CurrentUser() user: JwtPayload, @Query() query: FindQuoteQueryDto) {
    return this.quoteService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '인용구 단건 조회' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponseDto(QuoteResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '인용구가 없거나 본인 것이 아님')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quoteService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '인용구 수정 (readingLogId: null이면 독서 기록 연결 해제)',
  })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponseDto(QuoteResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    '페이지가 이 책의 총 페이지 수를 초과함',
  )
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    '인용구가 없거나 본인 것이 아님, 또는 readingLogId가 이 책의 독서 기록이 아님',
  )
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quoteService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '인용구 삭제' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiVoidResponseDto('삭제됨')
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '인용구가 없거나 본인 것이 아님')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quoteService.remove(user.sub, id);
  }
}
