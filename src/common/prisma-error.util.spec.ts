import { PrismaErrorUtil } from './prisma-error.util';
import { createPrismaError } from './testing/test-helpers';

describe('PrismaErrorUtil', () => {
  describe('isUniqueConstraintViolation', () => {
    it('P2002이고 target(string)에 field가 포함되면 true를 반환한다', () => {
      const error = createPrismaError('P2002', { target: 'email' });

      expect(PrismaErrorUtil.isUniqueConstraintViolation(error, 'email')).toBe(
        true,
      );
    });

    it('P2002이고 target(array)에 field가 포함되면 true를 반환한다', () => {
      const error = createPrismaError('P2002', {
        target: ['userId', 'bookId'],
      });

      expect(PrismaErrorUtil.isUniqueConstraintViolation(error, 'bookId')).toBe(
        true,
      );
    });

    it('P2002이지만 target에 field가 없으면 false를 반환한다', () => {
      const error = createPrismaError('P2002', { target: ['userId'] });

      expect(PrismaErrorUtil.isUniqueConstraintViolation(error, 'bookId')).toBe(
        false,
      );
    });

    it('code가 P2002가 아니면 false를 반환한다', () => {
      const error = createPrismaError('P2025', { target: 'email' });

      expect(PrismaErrorUtil.isUniqueConstraintViolation(error, 'email')).toBe(
        false,
      );
    });

    it('Prisma 에러가 아니면 false를 반환한다', () => {
      expect(
        PrismaErrorUtil.isUniqueConstraintViolation(new Error('boom'), 'email'),
      ).toBe(false);
    });

    it('target이 없으면 false를 반환한다', () => {
      const error = createPrismaError('P2002');

      expect(PrismaErrorUtil.isUniqueConstraintViolation(error, 'email')).toBe(
        false,
      );
    });
  });

  describe('isRecordNotFound', () => {
    it('P2025이면 true를 반환한다', () => {
      const error = createPrismaError('P2025');

      expect(PrismaErrorUtil.isRecordNotFound(error)).toBe(true);
    });

    it('P2025가 아니면 false를 반환한다', () => {
      const error = createPrismaError('P2002');

      expect(PrismaErrorUtil.isRecordNotFound(error)).toBe(false);
    });

    it('Prisma 에러가 아니면 false를 반환한다', () => {
      expect(PrismaErrorUtil.isRecordNotFound(new Error('boom'))).toBe(false);
    });
  });
});
