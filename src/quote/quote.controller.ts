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
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
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
    HttpStatus.NOT_FOUND,
    '독서 기록이 없거나 본인 것이 아님 (소유권은 Quote→ReadingLog→MyBook 두 단계)',
  )
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuoteDto) {
    return this.quoteService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '특정 ReadingLog의 인용구 목록 조회' })
  @ApiQuery({
    name: 'readingLogId',
    type: Number,
    description: 'ReadingLog ID',
  })
  @ApiResponseDto(QuoteResponseDto, { isArray: true })
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '독서 기록이 없거나 본인 것이 아님')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('readingLogId', ParseIntPipe) readingLogId: number,
  ) {
    return this.quoteService.findAll(user.sub, readingLogId);
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
  @ApiOperation({ summary: '인용구 수정' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponseDto(QuoteResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '인용구가 없거나 본인 것이 아님')
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
