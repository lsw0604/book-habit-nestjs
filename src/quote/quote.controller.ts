import type { JwtPayload } from '../auth/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';
import { ApiResponseDto } from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Quote')
@UseGuards(AccessTokenGuard)
@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @ApiOperation({ summary: '인용구 생성' })
  @ApiResponseDto(QuoteResponseDto)
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
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('readingLogId', ParseIntPipe) readingLogId: number,
  ) {
    return this.quoteService.findAll(user.sub, readingLogId);
  }

  @Get(':id')
  @ApiOperation({ summary: '인용구 단건 조회' })
  @ApiResponseDto(QuoteResponseDto)
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quoteService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '인용구 수정' })
  @ApiResponseDto(QuoteResponseDto)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quoteService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '인용구 삭제' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quoteService.remove(user.sub, id);
  }
}
