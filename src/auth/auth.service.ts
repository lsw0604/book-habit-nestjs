import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Provider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { JwtPayload } from './types';
import { KakaoOAuthService, SocialOAuthUserInfo } from './providers';

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

  async signUp(createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);

    return {
      token: this.issueTokens({ sub: user.id }),
      user,
    };
  }

  me(userId: number) {
    return this.userService.findOne(userId);
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
      token: this.issueTokens({ sub: user.id }),
      user: this.toPublicUser(user),
    };
  }

  async kakaoCallback(code: string) {
    const redirectUri =
      this.configService.getOrThrow<string>('KAKAO_CALLBACK_URL');

    const userInfo = await this.kakaoOAuthService.exchangeCodeForUserInfo(
      code,
      redirectUri,
    );

    return this.loginWithSocialProvider(Provider.KAKAO, userInfo);
  }

  // 소셜 로그인 provider(카카오, 그리고 앞으로 추가될 구글/네이버 등) 공통 처리.
  // 각 provider의 XxxOAuthService가 SocialOAuthProvider를 구현해 userInfo만
  // 넘겨주면, 로그인/가입 및 계정 연결 검증은 여기서 provider 무관하게 처리한다.
  //
  // 이메일이 일치해도 기존 유저의 provider가 다르면 병합하지 않고 거부한다 -
  // 그렇지 않으면 이메일만 보고 "같은 사람"으로 오인해 계정이 뒤바뀔 수 있음
  // (계정 연결 혼동). 새 provider를 추가해도 이 검증이 그대로 적용된다.
  private async loginWithSocialProvider(
    provider: Provider,
    userInfo: SocialOAuthUserInfo,
  ) {
    let user = await this.userService.findByEmail(userInfo.email);

    if (user && user.provider !== provider) {
      throw new ConflictException('이미 다른 방식으로 가입된 이메일입니다.');
    }

    if (!user) {
      user = await this.userService.createOAuthUser({ ...userInfo, provider });
    }

    return {
      token: this.issueTokens({ sub: user.id }),
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
      { sub: payload.sub },
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
