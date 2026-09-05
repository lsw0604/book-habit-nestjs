import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { AuthUserResponseDto, KakaoCallbackQueryDto, LoginDto } from './dto';
import { ApiResponseDto, ResponseMessage } from '../common';
import { AccessTokenGuard, RefreshTokenGuard } from './guards';
import { CurrentUser } from './decorators';
import type { JwtPayload } from './types';
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_THROTTLE,
  KAKAO_OAUTH_STATE_COOKIE,
  KAKAO_OAUTH_STATE_COOKIE_PATH,
  KAKAO_OAUTH_STATE_MAX_AGE_MS,
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

  @Throttle(AUTH_THROTTLE)
  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponseDto(AuthUserResponseDto)
  @ResponseMessage('회원가입이 완료되었습니다.')
  async signUp(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.authService.signUp(createUserDto);

    this.setAuthCookies(res, response.token);

    return {
      user: response.user,
    };
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponseDto(AuthUserResponseDto)
  @ResponseMessage('로그인되었습니다.')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    this.setAuthCookies(res, response.token);

    return {
      user: response.user,
    };
  }

  // OAuth 왕복 전체를 백엔드가 소유한다. 프론트는 이 URL로 페이지 이동만 하면 되고
  // (fetch 아님 - 302를 브라우저가 따라가야 함), client_id/redirect_uri는 서버 밖으로
  // 나가지 않는다. 아래 두 라우트는 JSON이 아니라 리다이렉트로 응답하므로
  // passthrough 없이 @Res()로 응답을 직접 소유한다(ResponseDtoInterceptor가 감싸지 못하게).
  @Throttle(AUTH_THROTTLE)
  @Get('kakao')
  @ApiOperation({ summary: '카카오 로그인 시작 (카카오 인가 페이지로 302)' })
  @ApiResponse({ status: HttpStatus.FOUND, description: '카카오 인가 페이지' })
  kakaoAuthorize(@Res() res: Response) {
    const state = randomUUID();

    this.setCookie(res, KAKAO_OAUTH_STATE_COOKIE, state, {
      path: KAKAO_OAUTH_STATE_COOKIE_PATH,
      maxAge: KAKAO_OAUTH_STATE_MAX_AGE_MS,
    });

    res.redirect(this.authService.buildKakaoAuthorizeUrl(state));
  }

  // 카카오가 ?code=&state= 를 붙여 브라우저를 되돌려 보내는 곳.
  // 전역 ResponseExceptionFilter는 예외를 JSON으로 내보내므로, 여기서 새어 나가면
  // 사용자가 로그인 도중 날 JSON을 보게 된다. 그래서 모든 실패를 직접 잡아
  // 프론트 로그인 페이지로 리다이렉트한다.
  @Throttle(AUTH_THROTTLE)
  @Get('kakao/callback')
  @ApiOperation({ summary: '카카오 로그인 콜백 (state 검증 + 세션 쿠키 발급)' })
  @ApiResponse({ status: HttpStatus.FOUND, description: '프론트엔드로 복귀' })
  async kakaoCallback(
    @Query() query: KakaoCallbackQueryDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // 일치 여부와 무관하게 1회용으로 즉시 만료시킨다(재사용 차단).
    const expectedState = req.cookies?.[KAKAO_OAUTH_STATE_COOKIE] as
      string | undefined;
    res.clearCookie(KAKAO_OAUTH_STATE_COOKIE, {
      ...this.baseCookieOptions(),
      path: KAKAO_OAUTH_STATE_COOKIE_PATH,
    });

    // 사용자가 동의 화면에서 취소한 경우 카카오는 code 대신 error를 보낸다.
    if (query.error) {
      return this.redirectToLogin(res, query.error);
    }

    if (!query.code || !query.state || query.state !== expectedState) {
      return this.redirectToLogin(res, 'invalid_state');
    }

    try {
      const response = await this.authService.kakaoCallback(query.code);
      this.setAuthCookies(res, response.token);
    } catch {
      return this.redirectToLogin(res, 'kakao_login_failed');
    }

    res.redirect(this.frontendUrl());
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: 'access token 재발급' })
  @ResponseMessage('access token이 재발급되었습니다.')
  refresh(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = this.authService.issueAccessToken(user);

    this.setCookie(res, ACCESS_TOKEN_COOKIE, accessToken, {
      maxAge: parseExpiresInMs(
        this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
      ),
    });
  }

  // access token이 없거나 만료되면 401을 던짐 - 다른 보호된 엔드포인트와 동일하게,
  // 클라이언트의 공통 401 인터셉터(리프레시 시도 → 실패 시 로그인 페이지로)가 처리하도록 함.
  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponseDto(AuthUserResponseDto)
  @ResponseMessage('로그인 상태를 조회했습니다.')
  async me(@CurrentUser() user: JwtPayload) {
    return {
      user: await this.authService.me(user.sub),
    };
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

  private redirectToLogin(res: Response, error: string) {
    const target = new URL('/login', this.frontendUrl());
    target.searchParams.set('error', error);

    res.redirect(target.toString());
  }

  private frontendUrl(): string {
    return this.configService.getOrThrow<string>('FRONTEND_URL');
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
