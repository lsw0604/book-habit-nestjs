import { PaginationMeta } from './pagination.dto';

export type PaginationOptions = {
  pageNumber: number;
  pageSize: number;
};

export type PrismaSkipTake = {
  skip: number;
  take: number;
};

export type PaginationResponse<T, K extends string = 'data'> = {
  meta: PaginationMeta;
} & Record<K, T[]>;

export class PaginationUtil {
  static getPaginationMeta(
    totalCount: number,
    options: PaginationOptions,
  ): PaginationMeta {
    const { pageNumber, pageSize } = options;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      totalCount,
      totalPages,
      currentPage: pageNumber,
      hasNextPage: pageNumber < totalPages,
      hasPrevPage: pageNumber > 1,
      nextPage: pageNumber < totalPages ? pageNumber + 1 : undefined,
      prevPage: pageNumber > 1 ? pageNumber - 1 : undefined,
    };
  }

  static getSkipTake(options: PaginationOptions): PrismaSkipTake {
    return {
      skip: (options.pageNumber - 1) * options.pageSize,
      take: options.pageSize,
    };
  }
}
