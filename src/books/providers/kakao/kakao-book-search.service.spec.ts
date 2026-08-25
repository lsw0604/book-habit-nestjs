import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import type { AxiosError, AxiosResponse } from 'axios';
import { KakaoBookSearchService } from './kakao-book-search.service';
import type { KakaoDocument, ResponseKakaoSearchBook } from './kakao.types';

function fakeAxiosResponse(
  data: ResponseKakaoSearchBook,
): AxiosResponse<ResponseKakaoSearchBook> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse['config'],
  };
}

function fakeDocument(overrides: Partial<KakaoDocument> = {}): KakaoDocument {
  return {
    title: '미움받을 용기',
    contents: '도서 소개',
    url: 'https://book.kakao.com/1',
    isbn: '8996991341 9788996991342',
    datetime: '2014-11-17T00:00:00.000+09:00',
    authors: ['기시미 이치로'],
    publisher: '인플루엔셜',
    translators: ['전경아'],
    price: 12000,
    sale_price: 10800,
    thumbnail: 'https://img.kakao.com/1.jpg',
    status: '정상판매',
    ...overrides,
  };
}

function fakeResponse(
  documents: KakaoDocument[],
  totalCount = documents.length,
): ResponseKakaoSearchBook {
  return {
    meta: {
      total_count: totalCount,
      pageable_count: totalCount,
      is_end: true,
    },
    documents,
  };
}

/** httpService.get에 전달된 URL을 파싱해 쿼리 파라미터를 꺼낸다. */
function requestedParams(httpGet: jest.Mock): URLSearchParams {
  const calls = httpGet.mock.calls as unknown[][];
  const [firstCall] = calls;
  const [url] = firstCall;
  return new URL(url as string).searchParams;
}

describe('KakaoBookSearchService', () => {
  let service: KakaoBookSearchService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KakaoBookSearchService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: () => 'fake-rest-api-key' },
        },
      ],
    }).compile();

    service = module.get(KakaoBookSearchService);
  });

  describe('요청 구성', () => {
    it('선택 파라미터를 생략하면 기본값(accuracy/1/10/title)을 사용한다', async () => {
      httpService.get.mockReturnValue(of(fakeAxiosResponse(fakeResponse([]))));

      await service.search({ query: '미움받을 용기' });

      const params = requestedParams(httpService.get);
      expect(params.get('query')).toBe('미움받을 용기');
      expect(params.get('sort')).toBe('accuracy');
      expect(params.get('page')).toBe('1');
      expect(params.get('size')).toBe('10');
      expect(params.get('target')).toBe('title');
    });

    it('전달된 파라미터를 그대로 반영한다', async () => {
      httpService.get.mockReturnValue(of(fakeAxiosResponse(fakeResponse([]))));

      await service.search({
        query: '용기',
        sort: 'latest',
        page: 3,
        size: 20,
        target: 'isbn',
      });

      const params = requestedParams(httpService.get);
      expect(params.get('sort')).toBe('latest');
      expect(params.get('page')).toBe('3');
      expect(params.get('size')).toBe('20');
      expect(params.get('target')).toBe('isbn');
    });

    it('REST API 키를 Authorization 헤더에 담아 보낸다', async () => {
      httpService.get.mockReturnValue(of(fakeAxiosResponse(fakeResponse([]))));

      await service.search({ query: '용기' });

      const calls = httpService.get.mock.calls as unknown[][];
      const [, config] = calls[0] as [
        string,
        { headers: { Authorization: string } },
      ];
      expect(config.headers.Authorization).toBe('KakaoAK fake-rest-api-key');
    });
  });

  describe('응답 매핑', () => {
    it('documents를 DTO로 변환하고 페이지네이션 meta를 계산한다', async () => {
      httpService.get.mockReturnValue(
        of(fakeAxiosResponse(fakeResponse([fakeDocument()], 25))),
      );

      const result = await service.search({ query: '용기', page: 2, size: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('미움받을 용기');
      expect(result.items[0].translators).toEqual(['전경아']);
      expect(result.meta.totalCount).toBe(25);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.currentPage).toBe(2);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('빈 결과도 정상 처리한다', async () => {
      httpService.get.mockReturnValue(
        of(fakeAxiosResponse(fakeResponse([], 0))),
      );

      const result = await service.search({ query: '없는책' });

      expect(result.items).toEqual([]);
      expect(result.meta.totalCount).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });

  it('외부 API 호출이 실패하면 BadGatewayException으로 변환한다', async () => {
    httpService.get.mockReturnValue(
      throwError(() => ({ response: { data: 'error' } }) as AxiosError),
    );

    await expect(service.search({ query: '용기' })).rejects.toThrow(
      BadGatewayException,
    );
  });
});
