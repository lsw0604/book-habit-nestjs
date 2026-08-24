import { Prisma } from '@prisma/client';

export class PrismaErrorUtil {
  /** Prisma P2002(유니크 제약 위반) 에러이면서 error.meta.target에 field가 포함되는지 확인한다. */
  static isUniqueConstraintViolation(
    error: unknown,
    field: string,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      PrismaErrorUtil.targetIncludes(error.meta?.target, field)
    );
  }

  /** Prisma P2025(레코드 없음) 에러인지 확인한다. */
  static isRecordNotFound(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  private static targetIncludes(target: unknown, field: string): boolean {
    if (typeof target === 'string') {
      return target.includes(field);
    }
    if (Array.isArray(target)) {
      return target.some((t) => typeof t === 'string' && t.includes(field));
    }
    return false;
  }
}
