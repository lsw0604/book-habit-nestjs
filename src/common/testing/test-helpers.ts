import { Prisma } from '@prisma/client';
import type { AxiosResponse } from 'axios';

/**
 * 단위 테스트 전용 공용 헬퍼.
 *
 * 프로덕션 배럴(`src/common/index.ts`)에서 재export하지 않으며,
 * `tsconfig.build.json`의 exclude에 등록되어 dist에도 포함되지 않는다.
 * 프로덕션 코드에서 import하면 안 된다.
 */

/** Prisma가 던지는 것과 같은 형태의 알려진 에러를 만든다 (P2002/P2025 분기 테스트용). */
export function createPrismaError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mock prisma error', {
    code,
    clientVersion: '6.12.0',
    meta,
  });
}

/** 목이 처음 호출될 때 받은 첫 번째 인자를 꺼낸다. 호출된 적이 없으면 명시적으로 실패시킨다. */
export function firstCallArg(mockFn: jest.Mock): unknown {
  const calls = mockFn.mock.calls as unknown[][];

  if (calls.length === 0) {
    throw new Error(
      '목이 한 번도 호출되지 않아 인자를 확인할 수 없습니다. ' +
        '호출 자체를 검증하려면 expect(mock).toHaveBeenCalled()를 먼저 쓰세요.',
    );
  }

  const [[arg]] = calls;
  return arg;
}

/**
 * 목에 전달된 Prisma 인자의 where를 꺼낸다.
 *
 * Prisma 목은 where를 실제로 평가하지 않으므로, 소유권 조건(userId 등)은
 * 이렇게 인자를 직접 단언해야만 검증된다 - 단언이 없으면 소유권 조건을
 * 통째로 제거해도 테스트가 통과한다.
 */
export function callWhere(mockFn: jest.Mock): Record<string, unknown> {
  return (firstCallArg(mockFn) as { where: Record<string, unknown> }).where;
}

/** 목에 전달된 Prisma 인자의 data를 꺼낸다. */
export function callData<T = Record<string, unknown>>(mockFn: jest.Mock): T {
  return (firstCallArg(mockFn) as { data: T }).data;
}

/** HttpService 목이 반환할 성공 응답을 만든다. */
export function fakeAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse['config'],
  };
}
