import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto';
import { ResponseMessage } from '../common';
import { AccessTokenGuard, OptionalAccessTokenGuard } from './guards';
import { CurrentUser } from './decorators';
import type { JwtPayload } from './types';
import {
  ACCESS_TOKEN_COOKIE,
  parseExpiresInMs,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
} from './auth.constants';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ResponseMessage('회원가입이 완료되었습니다.')
  signUp(@Body() createUserDto: CreateUserDto) {
    return this.authService.signUp(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ResponseMessage('로그인되었습니다.')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    this.setAuthCookies(res, tokens);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'access token 재발급' })
  @ResponseMessage('access token이 재발급되었습니다.')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('refresh token이 존재하지 않습니다.');
    }

    const { accessToken } =
      await this.authService.refreshAccessToken(refreshToken);

    this.setCookie(res, ACCESS_TOKEN_COOKIE, accessToken, {
      maxAge: parseExpiresInMs(
        this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
      ),
    });
  }

  // 로그인/비로그인 요청 모두 200으로 통과시키고, isAuthenticated로 화면 분기하도록
  // 하는 용도의 참고 엔드포인트. 다른 컨트롤러에서도 이 가드 + 데코레이터 조합을
  // 그대로 재사용하면 됨.
  @Get('me')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiOperation({ summary: '로그인 상태 확인 (비로그인이어도 401 없이 통과)' })
  @ResponseMessage('로그인 상태를 조회했습니다.')
  me(@CurrentUser() user?: JwtPayload) {
    return { isAuthenticated: Boolean(user), user: user ?? null };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '로그아웃' })
  @ResponseMessage('로그아웃되었습니다.')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.baseCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      ...this.baseCookieOptions(),
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  }

  private setAuthCookies(res: Response, tokens: AuthTokens) {
    this.setCookie(res, ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      maxAge: parseExpiresInMs(
        this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
      ),
    });

    this.setCookie(res, REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      path: REFRESH_TOKEN_COOKIE_PATH,
      maxAge: parseExpiresInMs(
        this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
      ),
    });
  }

  private setCookie(
    res: Response,
    name: string,
    value: string,
    options: CookieOptions,
  ) {
    res.cookie(name, value, { ...this.baseCookieOptions(), ...options });
  }

  private baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get('NODE_ENV') === 'production',
    };
  }
}
