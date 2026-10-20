import type { JwtPayload } from '../auth/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { BookNoteService } from './book-note.service';
import { UpsertBookNoteDto } from './dto/upsert-book-note.dto';
import {
  BookNoteResponseDto,
  BookNoteTemplateResponseDto,
} from './dto/book-note-response.dto';
import {
  ApiErrorResponse,
  ApiResponseDto,
  ApiUnauthorizedResponse,
  ApiVoidResponseDto,
} from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';

const MY_BOOK_ID_PARAM = {
  name: 'myBookId',
  description: 'MyBook ID (노트는 MyBook당 하나라 노트 ID 대신 쓴다)',
};

// 템플릿 목록은 공개라 가드와 쿠키 보안 선언을 컨트롤러가 아니라 메서드마다 붙인다
// (컨트롤러 단위로 붙이면 templates까지 "쿠키 필수"로 문서화된다).
@ApiTags('BookNote')
@Controller('book-note')
export class BookNoteController {
  constructor(private readonly bookNoteService: BookNoteService) {}

  @Get('templates')
  @ApiOperation({
    summary: '독서 노트 기록법 템플릿 목록',
    description:
      '섹션 구성·안내 질문의 단일 출처. 클라이언트는 문구를 하드코딩하지 않고 이 응답을 쓴다.',
  })
  @ApiResponseDto(BookNoteTemplateResponseDto, { isArray: true })
  findTemplates() {
    return this.bookNoteService.findTemplates();
  }

  @Get('by-my-book/:myBookId')
  @UseGuards(AccessTokenGuard)
  @ApiAccessCookieAuth()
  @ApiOperation({ summary: '서재 항목의 독서 노트 조회' })
  @ApiParam(MY_BOOK_ID_PARAM)
  @ApiResponseDto(BookNoteResponseDto, {
    description: '노트를 아직 쓰지 않았거나 남의 서재 항목이면 data는 null',
  })
  @ApiUnauthorizedResponse()
  findByMyBookId(
    @CurrentUser() user: JwtPayload,
    @Param('myBookId', ParseIntPipe) myBookId: number,
  ) {
    return this.bookNoteService.findByMyBookId(user.sub, myBookId);
  }

  @Put('by-my-book/:myBookId')
  @UseGuards(AccessTokenGuard)
  @ApiAccessCookieAuth()
  @ApiOperation({
    summary: '독서 노트 저장 (없으면 생성, 있으면 교체)',
    description:
      '보낸 섹션만 바뀌고 보내지 않은 섹션은 그대로다. 공백만 보낸 섹션은 비워진다. 템플릿을 바꾸면 기존 섹션이 모두 지워진다.',
  })
  @ApiParam(MY_BOOK_ID_PARAM)
  @ApiResponseDto(BookNoteResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(
    HttpStatus.BAD_REQUEST,
    '템플릿에 없는 섹션 key, 섹션 중복, 또는 섹션 글자 수 초과',
  )
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '서재 항목이 없거나 본인 것이 아님')
  upsert(
    @CurrentUser() user: JwtPayload,
    @Param('myBookId', ParseIntPipe) myBookId: number,
    @Body() dto: UpsertBookNoteDto,
  ) {
    return this.bookNoteService.upsert(user.sub, myBookId, dto);
  }

  @Delete('by-my-book/:myBookId')
  @UseGuards(AccessTokenGuard)
  @ApiAccessCookieAuth()
  @ApiOperation({ summary: '독서 노트 삭제' })
  @ApiParam(MY_BOOK_ID_PARAM)
  @ApiVoidResponseDto()
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(
    HttpStatus.NOT_FOUND,
    '노트가 없거나 서재 항목이 본인 것이 아님',
  )
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('myBookId', ParseIntPipe) myBookId: number,
  ) {
    return this.bookNoteService.remove(user.sub, myBookId);
  }
}
