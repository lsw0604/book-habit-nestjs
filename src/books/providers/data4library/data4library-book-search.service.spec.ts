import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import type { AxiosError } from 'axios';
import { Data4LibraryBookSearchService } from './data4library-book-search.service';
import type {
  Data4LibraryBookRaw,
  ResponseData4LibraryDetail,
} from './data4library.types';
import { fakeAxiosResponse } from '../../../common/testing/test-helpers';

function fakeBook(
  overrides: Partial<Data4LibraryBookRaw> = {},
): Data4LibraryBookRaw {
  return {
    bookname: '미움받을 용기',
    authors: '기시미 이치로 지음',
    publisher: '인플루엔셜',
    bookImageURL: '',
    description: '',
    publication_date: '2014',
    publication_year: '2014',
    isbn: '8996991341',
    isbn13: '9788996991342',
    vol: '',
    class_no: '',
    class_nm: '',
    ...overrides,
  };
}

function fakeResponse(response: ResponseData4LibraryDetail['response']) {
  return of(fakeAxiosResponse<ResponseData4LibraryDetail>({ response }));
}

describe('Data4LibraryBookSearchService', () => {
  let service: Data4LibraryBookSearchService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Data4LibraryBookSearchService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: () => 'fake-auth-key' },
        },
      ],
    }).compile();

    service = module.get(Data4LibraryBookSearchService);
  });

  it('ISBN이 일치하는 도서를 DTO로 변환해 반환한다', async () => {
    httpService.get.mockReturnValue(
      fakeResponse({ detail: [{ book: fakeBook() }] }),
    );

    const result = await service.getByIsbn('9788996991342');

    expect(result.isbn).toBe('9788996991342');
    expect(result.title).toBe('미움받을 용기');
    expect(httpService.get).toHaveBeenCalledWith(
      'https://data4library.kr/api/srchDtlList',
      expect.objectContaining({
        params: expect.objectContaining({
          authKey: 'fake-auth-key',
          isbn13: '9788996991342',
          format: 'json',
        }) as unknown,
      }),
    );
  });

  it('일치하는 도서가 없으면 NotFoundException을 던진다', async () => {
    httpService.get.mockReturnValue(fakeResponse({ detail: [] }));

    await expect(service.getByIsbn('0000000000000')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('인증 실패 응답(errCode/error)은 BadGatewayException으로 변환한다', async () => {
    httpService.get.mockReturnValue(
      fakeResponse({
        errCode: 'authErr',
        error: '인증정보가 일치하지 않습니다.',
      }),
    );

    await expect(service.getByIsbn('9788996991342')).rejects.toThrow(
      BadGatewayException,
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
