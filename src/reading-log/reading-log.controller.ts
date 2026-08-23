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
import { ReadingLogService } from './reading-log.service';
import { CreateReadingLogDto } from './dto/create-reading-log.dto';
import { UpdateReadingLogDto } from './dto/update-reading-log.dto';
import { AccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@UseGuards(AccessTokenGuard)
@Controller('reading-log')
export class ReadingLogController {
  constructor(private readonly readingLogService: ReadingLogService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReadingLogDto) {
    return this.readingLogService.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('myBookId', ParseIntPipe) myBookId: number,
  ) {
    return this.readingLogService.findAll(user.sub, myBookId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingLogService.findOne(user.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReadingLogDto,
  ) {
    return this.readingLogService.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingLogService.remove(user.sub, id);
  }
}
