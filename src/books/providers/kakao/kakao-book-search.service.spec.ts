import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import type { AxiosError } from 'axios';
import { KakaoBookSearchService } from './kakao-book-search.service';
import type { KakaoDocument, ResponseKakaoSearchBook } from './kakao.types';
import { fakeAxiosResponse } from '../../../common/testing/test-helpers';

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
  meta: Partial<ResponseKakaoSearchBook['meta']> = {},
): ResponseKakaoSearchBook {
  return {
    meta: {
      total_count: totalCount,
      pageable_count: totalCount,
      is_end: false,
      ...meta,
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

    it('isbn을 정규화된 ISBN-13과 식별자 종류로, datetime을 날짜 문자열로 바꿔 보낸다', async () => {
      httpService.get.mockReturnValue(
        of(fakeAxiosResponse(fakeResponse([fakeDocument()]))),
      );

      const [item] = (await service.search({ query: '용기' })).items;

      expect(item.isbn).toBe('9788996991342');
      expect(item.identifierType).toBe('ISBN');
      expect(item.pubDate).toBe('2014-11-17');
    });

    it('잡지(ISSN)는 목록에서 빼지 않고 isbn null로 표시만 한다', async () => {
      httpService.get.mockReturnValue(
        of(
          fakeAxiosResponse(
            fakeResponse([
              fakeDocument(),
              fakeDocument({ isbn: '1228402000 9771228402006' }),
            ]),
          ),
        ),
      );

      const { items } = await service.search({ query: '씨네21' });

      expect(items).toHaveLength(2);
      expect(items[1]).toMatchObject({ isbn: null, identifierType: 'ISSN' });
    });

    it('datetime이 비어 있으면 pubDate는 null이다', async () => {
      httpService.get.mockReturnValue(
        of(fakeAxiosResponse(fakeResponse([fakeDocument({ datetime: '' })]))),
      );

      const [item] = (await service.search({ query: '용기' })).items;

      expect(item.pubDate).toBeNull();
    });

    it('카카오 조회 한도(50페이지)를 넘는 결과는 한도까지만 페이지로 계산한다', async () => {
      httpService.get.mockReturnValue(
        of(
          fakeAxiosResponse(
            fakeResponse([fakeDocument()], 100000, { pageable_count: 5000 }),
          ),
        ),
      );

      const result = await service.search({
        query: '용기',
        page: 50,
        size: 10,
      });

      expect(result.meta.totalCount).toBe(500);
      expect(result.meta.totalPages).toBe(50);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.nextPage).toBeUndefined();
    });

    // 2026-09-30 "소설" 검색 실제 meta. 20페이지(size 50)에서 is_end가 true가 되고,
    // 그 뒤로는 같은 페이지가 반복된다.
    it.each([
      [19, true],
      [20, false],
    ])(
      'pageable_count 1000, size 50이면 20페이지까지다 (page %i → hasNextPage %p)',
      async (page, hasNextPage) => {
        httpService.get.mockReturnValue(
          of(
            fakeAxiosResponse(
              fakeResponse([fakeDocument()], 79265, {
                pageable_count: 1000,
                is_end: page === 20,
              }),
            ),
          ),
        );

        const result = await service.search({ query: '소설', page, size: 50 });

        expect(result.meta.totalCount).toBe(1000);
        expect(result.meta.totalPages).toBe(20);
        expect(result.meta.hasNextPage).toBe(hasNextPage);
      },
    );

    it('total_count가 아니라 실제로 넘겨볼 수 있는 pageable_count로 계산한다', async () => {
      httpService.get.mockReturnValue(
        of(
          fakeAxiosResponse(
            fakeResponse([fakeDocument()], 1000, { pageable_count: 30 }),
          ),
        ),
      );

      const result = await service.search({ query: '용기', size: 10 });

      expect(result.meta.totalCount).toBe(30);
      expect(result.meta.totalPages).toBe(3);
    });

    it('카카오가 is_end로 마지막 페이지라고 하면 계산과 무관하게 다음 페이지가 없다', async () => {
      httpService.get.mockReturnValue(
        of(
          fakeAxiosResponse(
            fakeResponse([fakeDocument()], 25, { is_end: true }),
          ),
        ),
      );

      const result = await service.search({ query: '용기', page: 2, size: 10 });

      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.nextPage).toBeUndefined();
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

  describe('getByIsbn', () => {
    it('target=isbn으로 조회해 ISBN이 정확히 같은 문서를 Book 모양으로 돌려준다', async () => {
      httpService.get.mockReturnValue(
        of(
          fakeAxiosResponse(
            fakeResponse([
              fakeDocument({
                isbn: '1168340772 9791168340770',
                title: '다른 판',
              }),
              fakeDocument(),
            ]),
          ),
        ),
      );

      const result = await service.getByIsbn('9788996991342');

      const params = requestedParams(httpService.get);
      expect(params.get('query')).toBe('9788996991342');
      expect(params.get('target')).toBe('isbn');
      expect(result.isbn).toBe('9788996991342');
      expect(result.title).toBe('미움받을 용기');
    });

    it('ISBN이 같은 문서가 없으면 NotFoundException을 던진다', async () => {
      httpService.get.mockReturnValue(
        of(
          fakeAxiosResponse(
            fakeResponse([fakeDocument({ isbn: '1168340772 9791168340770' })]),
          ),
        ),
      );

      await expect(service.getByIsbn('9788996991342')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('외부 API 호출이 실패하면 BadGatewayException으로 변환한다', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({ response: { data: 'error' } }) as AxiosError),
      );

      await expect(service.getByIsbn('9788996991342')).rejects.toThrow(
        BadGatewayException,
      );
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
