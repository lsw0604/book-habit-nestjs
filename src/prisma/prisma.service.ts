import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 개발 환경에서만 실제 나가는 SQL을 로그로 남긴다 - N+1이나 의도치 않은
    // 쿼리를 코드 리뷰가 아니라 런타임에 눈으로 확인하기 위함. 프로덕션은
    // 로그량/성능 부담이 있어 warn/error만 남김.
    super({
      log:
        process.env.NODE_ENV === 'production'
          ? ['warn', 'error']
          : ['query', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
