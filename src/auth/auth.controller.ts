import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { AuthUserResponseDto, KakaoCallbackDto, LoginDto } from './dto';
import { ApiResponseDto, ResponseMessage } from '../common';
import { AccessTokenGuard, RefreshTokenGuard } from './guards';
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

  // 브루트포스/스팸 가입 방지를 위해 전역 기본치(분당 100회)보다 훨씬 강하게 제한함.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  // 비밀번호 brute force 방지를 위해 전역 기본치보다 훨씬 강하게 제한함.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  // FE가 카카오 인가 페이지 이동/리다이렉트 수신을 전담하고, 여기서는
  // FE가 넘겨준 code를 받아 토큰 교환 + 로그인/회원가입만 처리함.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('kakao/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '카카오 로그인 (FE가 전달한 code로 토큰 교환)' })
  @ApiResponseDto(AuthUserResponseDto)
  @ResponseMessage('카카오 로그인이 완료되었습니다.')
  async kakaoCallback(
    @Body() kakaoCallbackDto: KakaoCallbackDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.authService.kakaoCallback(
      kakaoCallbackDto.code,
    );

    this.setAuthCookies(res, response.token);

    return {
      user: response.user,
    };
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
