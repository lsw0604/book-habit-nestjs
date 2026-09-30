import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import type { AxiosError } from 'axios';
import { NlBookSearchService } from './nl-book-search.service';
import type { NlDocumentRaw, ResponseNlSearchBook } from './nl.types';
import { fakeAxiosResponse } from '../../../common/testing/test-helpers';

function fakeDoc(overrides: Partial<NlDocumentRaw> = {}): NlDocumentRaw {
  return {
    TITLE: '미움받을 용기',
    VOL: '',
    SERIES_TITLE: '',
    SERIES_NO: '',
    AUTHOR: '기시미 이치로 지음',
    EA_ISBN: '9788996991342',
    EA_ADD_CODE: '',
    SET_ISBN: '',
    SET_ADD_CODE: '',
    SET_EXPRESSION: '',
    PUBLISHER: '인플루엔셜',
    EDITION_STMT: '',
    PRE_PRICE: '',
    KDC: '',
    DDC: '',
    PAGE: '336',
    BOOK_SIZE: '',
    FORM: '',
    PUBLISH_PREDATE: '20141117',
    SUBJECT: '',
    EBOOK_YN: 'N',
    CIP_YN: 'N',
    CONTROL_NO: '',
    TITLE_URL: '',
    BOOK_TB_CNT_URL: '',
    BOOK_INTRODUCTION_URL: '',
    BOOK_SUMMARY_URL: '',
    PUBLISHER_URL: '',
    INPUT_DATE: '',
    UPDATE_DATE: '',
    ...overrides,
  };
}

function fakeResponse(docs: NlDocumentRaw[]) {
  return of(
    fakeAxiosResponse<ResponseNlSearchBook>({
      PAGE_NO: '1',
      TOTAL_COUNT: String(docs.length),
      docs,
    }),
  );
}

describe('NlBookSearchService', () => {
  let service: NlBookSearchService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NlBookSearchService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: () => 'fake-cert-key' },
        },
      ],
    }).compile();

    service = module.get(NlBookSearchService);
  });

  it('ISBN이 정확히 일치하는 doc을 DTO로 변환해 반환한다', async () => {
    httpService.get.mockReturnValue(
      fakeResponse([
        fakeDoc({ EA_ISBN: '97889969913420', TITLE: '다른 책' }),
        fakeDoc(),
      ]),
    );

    const result = await service.getByIsbn('9788996991342');

    expect(result.isbn).toBe('9788996991342');
    expect(result.title).toBe('미움받을 용기');
    expect(httpService.get).toHaveBeenCalledWith(
      'https://www.nl.go.kr/seoji/SearchApi.do',
      expect.objectContaining({
        params: expect.objectContaining({
          cert_key: 'fake-cert-key',
          result_style: 'json',
          isbn: '9788996991342',
        }) as unknown,
      }),
    );
  });

  it('일치하는 ISBN이 없으면 NotFoundException을 던진다', async () => {
    httpService.get.mockReturnValue(fakeResponse([]));

    await expect(service.getByIsbn('0000000000000')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('docs가 없는 에러 응답(인증키 오류 등)은 BadGatewayException으로 변환한다', async () => {
    httpService.get.mockReturnValue(
      of(fakeAxiosResponse({ RESULT: 'ERROR', ERR_CODE: '011' })),
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
