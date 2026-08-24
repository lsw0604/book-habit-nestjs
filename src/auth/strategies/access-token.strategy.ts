import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';
import { JwtPayload } from '../types';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null =>
          (req?.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  // jwt.verify()가 돌려주는 실제 객체엔 iat/exp 같은 표준 클레임이 JwtPayload
  // 타입에 없는 채로 같이 붙어있다. 그대로 통과시키면 req.user(@CurrentUser())가
  // 선언된 타입보다 많은 값을 들고 다니게 되고, 그 값을 다시 서명하는 곳(예:
  // AuthService.issueAccessToken)에서 "payload에 exp가 이미 있다"는 jsonwebtoken
  // 에러로 터진다 - 그래서 여기서 선언된 필드만 남기고 걸러낸다.
  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub };
  }
}
