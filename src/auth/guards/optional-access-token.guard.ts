import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtPayload } from '../types';

// AuthGuard('jwt')와 동일하게 access_token 쿠키를 검증하지만, 토큰이 없거나
// 유효하지 않아도 401을 던지지 않고 그냥 통과시킴. 대신 req.user가 채워지지
// 않으므로(undefined) 컨트롤러/서비스에서 로그인 여부에 따라 분기하면 됨.
@Injectable()
export class OptionalAccessTokenGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtPayload>(_err: unknown, user: TUser | false): TUser {
    return (user || undefined) as TUser;
  }
}
