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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReadingGoalService } from './reading-goal.service';
import { CreateReadingGoalDto } from './dto/create-reading-goal.dto';
import { UpdateReadingGoalDto } from './dto/update-reading-goal.dto';
import { FindReadingGoalQueryDto } from './dto/find-reading-goal.query.dto';
import { ReadingGoalResponseDto } from './dto/reading-goal-response.dto';
import { ApiResponseDto } from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('ReadingGoal')
@UseGuards(AccessTokenGuard)
@Controller('reading-goal')
export class ReadingGoalController {
  constructor(private readonly readingGoalService: ReadingGoalService) {}

  @Post()
  @ApiOperation({ summary: '독서 목표 생성' })
  @ApiResponseDto(ReadingGoalResponseDto)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReadingGoalDto) {
    return this.readingGoalService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '독서 목표 목록 조회 (연도/월 필터)' })
  @ApiResponseDto(ReadingGoalResponseDto, { isArray: true })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindReadingGoalQueryDto,
  ) {
    return this.readingGoalService.findAll(user.sub, query.year, query.month);
  }

  @Get(':id')
  @ApiOperation({ summary: '독서 목표 단건 조회' })
  @ApiResponseDto(ReadingGoalResponseDto)
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingGoalService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '독서 목표 수정 (목표 값)' })
  @ApiResponseDto(ReadingGoalResponseDto)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReadingGoalDto,
  ) {
    return this.readingGoalService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '독서 목표 삭제' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingGoalService.remove(user.sub, id);
  }
}
