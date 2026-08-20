import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { JwtPayload } from './types';
import { KakaoOAuthService, KakaoOAuthUserDto } from './providers';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly kakaoOAuthService: KakaoOAuthService,
  ) {}

  signUp(createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  async me(email: string) {
    const user = await this.userService.findByEmail(email);
    return user ? this.toPublicUser(user) : null;
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    return {
      token: this.issueTokens({ sub: user.id, email: user.email! }),
      user: this.toPublicUser(user),
    };
  }

  async kakaoCallback(code: string) {
    const redirectUri =
      this.configService.getOrThrow<string>('KAKAO_CALLBACK_URL');

    const { access_token } = await this.kakaoOAuthService.getAccessToken(
      code,
      redirectUri,
    );
    const kakaoUserInfo =
      await this.kakaoOAuthService.getUserInfo(access_token);
    const { email, name, profile } = KakaoOAuthUserDto.from(kakaoUserInfo);

    let user = await this.userService.findByEmail(email);

    if (!user) {
      user = await this.userService.createOAuthUser({
        email,
        name,
        provider: 'KAKAO',
        profile,
      });
    }

    return {
      token: this.issueTokens({ sub: user.id, email: user.email! }),
      user: this.toPublicUser(user),
    };
  }

  // refresh token 자체는 재발급하지 않음 (stateless라 폐기/회전 추적이 불가능하므로
  // access token만 갱신하고, refresh token은 자신의 만료 시점까지 그대로 유지함)
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        '유효하지 않거나 만료된 refresh token입니다.',
      );
    }

    const accessToken = this.jwtService.sign(
      { sub: payload.sub, email: payload.email },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.expiresIn('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    return { accessToken };
  }

  private issueTokens(payload: JwtPayload): AuthTokens {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.expiresIn('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.expiresIn('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }

  // @nestjs/jwt의 expiresIn은 ms 패키지의 리터럴 유니온(StringValue)을 요구하지만
  // ConfigService는 일반 string만 반환함. 실제 형식 검증은 이 값을 그대로 쓰는
  // parseExpiresInMs(auth.constants.ts, 쿠키 maxAge 계산용)가 런타임에 담당함.
  private expiresIn(key: string) {
    return this.configService.getOrThrow<string>(key) as never;
  }

  // findByEmail()은 비밀번호 해시 비교를 위해 password를 포함해서 반환하므로,
  // 컨트롤러 응답으로 내보내기 전에 반드시 이걸 거쳐서 password를 제거해야 함.
  private toPublicUser<T extends { password: string | null }>(
    user: T,
  ): Omit<T, 'password'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...publicUser } = user;
    return publicUser;
  }
}
