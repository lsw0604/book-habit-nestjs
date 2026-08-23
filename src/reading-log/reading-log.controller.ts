import type { JwtPayload } from '../auth/types';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReadingLogService } from './reading-log.service';
import { CreateReadingLogDto } from './dto/create-reading-log.dto';
import { UpdateReadingLogDto } from './dto/update-reading-log.dto';
import { ReadingLogResponseDto } from './dto/reading-log-response.dto';
import { ApiResponseDto } from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('ReadingLog')
@UseGuards(AccessTokenGuard)
@Controller('reading-log')
export class ReadingLogController {
  constructor(private readonly readingLogService: ReadingLogService) {}

  @Post()
  @ApiOperation({ summary: '독서 기록 생성' })
  @ApiResponseDto(ReadingLogResponseDto)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReadingLogDto) {
    return this.readingLogService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '특정 MyBook의 독서 기록 목록 조회' })
  @ApiQuery({ name: 'myBookId', type: Number, description: 'MyBook ID' })
  @ApiResponseDto(ReadingLogResponseDto, { isArray: true })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('myBookId', ParseIntPipe) myBookId: number,
  ) {
    return this.readingLogService.findAll(user.sub, myBookId);
  }

  @Get(':id')
  @ApiOperation({ summary: '독서 기록 단건 조회' })
  @ApiResponseDto(ReadingLogResponseDto)
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingLogService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '독서 기록 수정' })
  @ApiResponseDto(ReadingLogResponseDto)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReadingLogDto,
  ) {
    return this.readingLogService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '독서 기록 삭제' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingLogService.remove(user.sub, id);
  }
}
