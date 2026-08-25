import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import type { AxiosError } from 'axios';
import { AladinBookSearchService } from './aladin-book-search.service';
import type {
  AladinDocumentRaw,
  ResponseAladinSearchBook,
} from './aladin.types';
import { fakeAxiosResponse } from '../../../common/testing/test-helpers';

function fakeItem(overrides: Partial<AladinDocumentRaw> = {}) {
  return {
    title: '미움받을 용기',
    link: 'https://aladin.co.kr/item/1',
    author: '기시미 이치로',
    pubDate: '2014-11-17',
    description: '설명',
    isbn: '9788996991342',
    isbn13: '9788996991342',
    itemId: 1,
    priceSales: 10000,
    priceStandard: 12000,
    mallType: 'BOOK',
    stockStatus: '',
    mileage: 100,
    cover: '',
    categoryId: 1,
    categoryName: '자기계발',
    publisher: '인플루엔셜',
    salesPoint: 100,
    adult: false,
    fixedPrice: true,
    customerReviewRank: 9,
    ...overrides,
  } satisfies AladinDocumentRaw;
}

describe('AladinBookSearchService', () => {
  let service: AladinBookSearchService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AladinBookSearchService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: () => 'fake-ttb-key' },
        },
      ],
    }).compile();

    service = module.get(AladinBookSearchService);
  });

  it('검색 결과가 있으면 첫 번째 item을 DTO로 변환해 반환한다', async () => {
    httpService.get.mockReturnValue(
      of(
        fakeAxiosResponse<ResponseAladinSearchBook>({
          version: 20131101,
          logo: '',
          title: '',
          link: '',
          pubDate: '',
          totalResults: 1,
          startIndex: 1,
          itemsPerPage: 1,
          query: '',
          searchCategoryId: 0,
          searchCategoryName: '',
          item: [fakeItem()],
        }),
      ),
    );

    const result = await service.getByIsbn('9788996991342');

    expect(result.isbn).toBe('9788996991342');
    expect(result.title).toBe('미움받을 용기');
  });

  it('검색 결과가 없으면 NotFoundException을 던진다', async () => {
    httpService.get.mockReturnValue(
      of(
        fakeAxiosResponse<ResponseAladinSearchBook>({
          version: 20131101,
          logo: '',
          title: '',
          link: '',
          pubDate: '',
          totalResults: 0,
          startIndex: 1,
          itemsPerPage: 1,
          query: '',
          searchCategoryId: 0,
          searchCategoryName: '',
          item: [],
        }),
      ),
    );

    await expect(service.getByIsbn('0000000000000')).rejects.toThrow(
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
