import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  ApiErrorResponse,
  ApiResponseDto,
  ApiUnauthorizedResponse,
} from '../common';
import { AccessTokenGuard } from '../auth/guards';
import { ApiAccessCookieAuth, CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/types';

// 이 컨트롤러는 "내 계정"만 다룬다.
//
// 가입(POST /user)은 두지 않는다 - AuthController(POST /auth/signup)가 같은
// CreateUserDto로 유저를 만들면서 세션 쿠키까지 발급하므로, 쿠키를 심지 않는
// 두 번째 가입 경로는 중복이고 가드도 걸 수 없다(가입 전에는 토큰이 없다).
//
// 유저 전체 조회(GET /user)도 두지 않는다 - 남의 이메일/생년월일/성별을 보는
// 화면이 제품에 없고, 가드를 붙여도 "로그인하면 전원 PII가 열린다"는 문제는
// 그대로 남는다. 관리자 기능이 생기면 그때 별도 경로로 만든다.
@ApiTags('User')
@ApiAccessCookieAuth()
@UseGuards(AccessTokenGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: '유저 단건 조회 (본인만)' })
  @ApiParam({ name: 'id', description: 'User ID. 본인 ID만 허용된다' })
  @ApiResponseDto(UserResponseDto)
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.FORBIDDEN, '본인 계정이 아님')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '해당 유저를 찾을 수 없음')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.assertSelf(user.sub, id);

    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '유저 정보 수정 (본인만)' })
  @ApiParam({ name: 'id', description: 'User ID. 본인 ID만 허용된다' })
  @ApiResponseDto(UserResponseDto)
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, '사용할 수 없는 이메일 도메인')
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.FORBIDDEN, '본인 계정이 아님')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '해당 유저를 찾을 수 없음')
  @ApiErrorResponse(HttpStatus.CONFLICT, '이미 가입된 이메일')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.assertSelf(user.sub, id);

    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '유저 삭제 (본인만)' })
  @ApiParam({ name: 'id', description: 'User ID. 본인 ID만 허용된다' })
  @ApiResponseDto(UserResponseDto, {
    description: '삭제된 유저 정보를 data로 돌려준다',
  })
  @ApiUnauthorizedResponse()
  @ApiErrorResponse(HttpStatus.FORBIDDEN, '본인 계정이 아님')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, '해당 유저를 찾을 수 없음')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.assertSelf(user.sub, id);

    return this.userService.remove(id);
  }

  // User는 소유권이 관계를 거치지 않고 자기 자신이라, 다른 도메인처럼 where에
  // userId를 끼워 넣는 대신 동일성 비교로 끝난다. 그래서 UserService가
  // currentUserId를 추가로 받지 않고 id 하나만 받는 모양을 유지한다 -
  // DB 조회가 필요 없는 검사를 서비스로 내릴 이유가 없다.
  //
  // 404가 아니라 403인 이유: id가 연속 정수라 404로 가려도 존재 여부가 숨겨지지
  // 않는데, 403은 "경로는 맞고 권한이 없다"를 클라이언트에 정확히 알려 준다.
  private assertSelf(currentUserId: number, id: number) {
    if (currentUserId !== id) {
      throw new ForbiddenException('본인 계정만 조회·수정·삭제할 수 있습니다.');
    }
  }
}
