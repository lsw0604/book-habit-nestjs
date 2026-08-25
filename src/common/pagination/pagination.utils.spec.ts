import { PaginationUtil } from './pagination.utils';

describe('PaginationUtil', () => {
  describe('getSkipTake', () => {
    it('첫 페이지는 skip이 0이다', () => {
      expect(
        PaginationUtil.getSkipTake({ pageNumber: 1, pageSize: 10 }),
      ).toEqual({ skip: 0, take: 10 });
    });

    it('pageNumber에 비례해 skip을 계산한다', () => {
      expect(
        PaginationUtil.getSkipTake({ pageNumber: 3, pageSize: 10 }),
      ).toEqual({ skip: 20, take: 10 });
    });
  });

  describe('getPaginationMeta', () => {
    it('중간 페이지는 이전/다음 페이지가 모두 존재한다', () => {
      const meta = PaginationUtil.getPaginationMeta(25, {
        pageNumber: 2,
        pageSize: 10,
      });

      expect(meta).toEqual({
        totalCount: 25,
        totalPages: 3,
        currentPage: 2,
        hasNextPage: true,
        hasPrevPage: true,
        nextPage: 3,
        prevPage: 1,
      });
    });

    it('첫 페이지는 이전 페이지가 없다', () => {
      const meta = PaginationUtil.getPaginationMeta(25, {
        pageNumber: 1,
        pageSize: 10,
      });

      expect(meta.hasPrevPage).toBe(false);
      expect(meta.prevPage).toBeUndefined();
    });

    it('마지막 페이지는 다음 페이지가 없다', () => {
      const meta = PaginationUtil.getPaginationMeta(25, {
        pageNumber: 3,
        pageSize: 10,
      });

      expect(meta.hasNextPage).toBe(false);
      expect(meta.nextPage).toBeUndefined();
    });

    it('전체 페이지가 1개면 이전/다음 페이지가 모두 없다', () => {
      const meta = PaginationUtil.getPaginationMeta(5, {
        pageNumber: 1,
        pageSize: 10,
      });

      expect(meta.totalPages).toBe(1);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(false);
    });

    it('totalCount가 0이면 totalPages는 0이다', () => {
      const meta = PaginationUtil.getPaginationMeta(0, {
        pageNumber: 1,
        pageSize: 10,
      });

      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
    });
  });
});
