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
import { ReadingGoalService } from './reading-goal.service';
import { CreateReadingGoalDto } from './dto/create-reading-goal.dto';
import { UpdateReadingGoalDto } from './dto/update-reading-goal.dto';
import { FindReadingGoalQueryDto } from './dto/find-reading-goal.query.dto';
import { ReadingGoalResponseDto } from './dto/reading-goal-response.dto';
import {
  ApiCreatedResponseDto,
  ApiErrorResponse,
  ApiResponseDto,
  ApiUnauthorizedResponse,
  ApiVoidResponseDto,
} from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';

@ApiTags('ReadingGoal')
@ApiAccessCookieAuth()
@UseGuards(AccessTokenGuard)
@Controller('reading-goal')
export class ReadingGoalController {
  constructor(private readonly readingGoalService: ReadingGoalService) {}

  @Post()
  @ApiOperation({
    summary: '독서 목표 생성',
    description:
      'month를 생략하면 연간 목표다. [year, month, metric]이 목표의 정체성이고 수정할 수 없다 — 바꾸려면 삭제 후 재생성한다.',
  })
  @ApiCreatedResponseDto(ReadingGoalResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.CONFLICT, '같은 연도·월·지표의 목표가 이미 있음')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReadingGoalDto) {
    return this.readingGoalService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '독서 목표 목록 조회 (연도/월 필터)' })
  @ApiResponseDto(ReadingGoalResponseDto, { isArray: true })
  @ApiUnauthorizedResponse()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindReadingGoalQueryDto,
  ) {
    return this.readingGoalService.findAll(user.sub, query.year, query.month);
  }

  @Get(':id')
  @ApiOperation({ summary: '독서 목표 단건 조회' })
  @ApiParam({ name: 'id', description: 'ReadingGoal ID' })
  @ApiResponseDto(ReadingGoalResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '목표가 없거나 본인 것이 아님')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingGoalService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '독서 목표 수정 (목표 값)' })
  @ApiParam({ name: 'id', description: 'ReadingGoal ID' })
  @ApiResponseDto(ReadingGoalResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '목표가 없거나 본인 것이 아님')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReadingGoalDto,
  ) {
    return this.readingGoalService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '독서 목표 삭제' })
  @ApiParam({ name: 'id', description: 'ReadingGoal ID' })
  @ApiVoidResponseDto('삭제됨')
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '목표가 없거나 본인 것이 아님')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.readingGoalService.remove(user.sub, id);
  }
}
