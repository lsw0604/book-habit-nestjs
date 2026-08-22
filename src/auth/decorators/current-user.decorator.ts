import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { JwtPayload } from '../types';

// AccessTokenGuard 하에서는 항상 값이 있지만, OptionalAccessTokenGuard 하에서는
// 비로그인 요청일 경우 undefined일 수 있음.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as JwtPayload | undefined;
  },
);
