import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { REFRESH_TOKEN_COOKIE } from '../auth.constants';
import { JwtPayload } from '../types';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null =>
          (req?.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  // jwt.verify()가 돌려주는 실제 객체엔 iat/exp 같은 표준 클레임이 JwtPayload
  // 타입에 없는 채로 같이 붙어있다. 그대로 통과시키면 이 payload를 그대로
  // 재서명하는 AuthService.issueAccessToken에서 "payload에 exp가 이미 있다"는
  // jsonwebtoken 에러로 터진다 - 그래서 여기서 선언된 필드만 남기고 걸러낸다.
  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub };
  }
}
