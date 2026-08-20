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
import { AuthUserResponseDto, KakaoCallbackDto, LoginDto } from './dto';
import { ApiResponseDto, ResponseMessage } from '../common';
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
  @ApiOperation({
    summary: '로그인 상태 확인 (비로그인이어도 401 없이 통과)',
    description: '비로그인 상태에서는 data가 없는 채로 200을 반환함.',
  })
  @ApiResponseDto(AuthUserResponseDto)
  @ResponseMessage('로그인 상태를 조회했습니다.')
  async me(@CurrentUser() user?: JwtPayload) {
    if (!user?.email) return;
    return {
      user: await this.authService.me(user.email),
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
