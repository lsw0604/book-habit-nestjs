import type { JwtPayload } from '../auth/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MyBookTagService } from './my-book-tag.service';
import { CreateMyBookTagDto } from './dto/create-my-book-tag.dto';
import { MyBookTagResponseDto } from './dto/my-book-tag-response.dto';
import {
  ApiCreatedResponseDto,
  ApiErrorResponse,
  ApiResponseDto,
  ApiUnauthorizedResponse,
  ApiVoidResponseDto,
} from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';

@ApiTags('MyBookTag')
@ApiAccessCookieAuth()
@UseGuards(AccessTokenGuard)
@Controller('my-book-tag')
export class MyBookTagController {
  constructor(private readonly myBookTagService: MyBookTagService) {}

  @Post()
  @ApiOperation({
    summary: '서재 항목에 태그 추가 (존재하지 않는 태그 값이면 자동 생성)',
  })
  @ApiCreatedResponseDto(MyBookTagResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '서재 항목이 없거나 본인 것이 아님')
  @ApiErrorResponse(HttpStatus.CONFLICT, '이미 등록된 태그')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMyBookTagDto) {
    return this.myBookTagService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '특정 서재 항목의 태그 목록 조회' })
  @ApiQuery({ name: 'myBookId', type: Number, description: 'MyBook ID' })
  @ApiResponseDto(MyBookTagResponseDto, { isArray: true })
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '서재 항목이 없거나 본인 것이 아님')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('myBookId', ParseIntPipe) myBookId: number,
  ) {
    return this.myBookTagService.findAll(user.sub, myBookId);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      '서재 항목에서 태그 제거 (Tag 자체는 삭제하지 않고 재사용을 위해 유지)',
  })
  @ApiParam({ name: 'id', description: 'MyBookTag ID (Tag ID가 아니다)' })
  @ApiVoidResponseDto('태그 연결만 끊김 (Tag 자체는 유지)')
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '태그 연결이 없거나 본인 것이 아님')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.myBookTagService.remove(user.sub, id);
  }
}
