import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import type { AxiosError } from 'axios';
import { Yes24BookSearchService } from './yes24-book-search.service';
import type { ResponseYes24, Yes24ItemRaw } from './yes24.types';
import { fakeAxiosResponse } from '../../../common/testing/test-helpers';

// 2026-10-15 실제 응답(클린 코드, detail=Y)에서 쓰는 필드만 옮겼다.
function fakeItem(overrides: Partial<Yes24ItemRaw> = {}): Yes24ItemRaw {
  return {
    itemId: 11681152,
    title: 'Clean Code 클린 코드',
    isbn13: '9788966260959',
    pages: 584,
    link: 'https://www.yes24.com/product/goods/11681152',
    ...overrides,
  };
}

function fakeResponse(items: Yes24ItemRaw[]) {
  return of(
    fakeAxiosResponse<ResponseYes24>({
      success: true,
      message: '성공',
      data: { items },
      errorCode: null,
    }),
  );
}

// YES24는 실패를 4xx 상태 코드 + 본문 errorCode로 준다.
function fakeHttpError(status: number, body: ResponseYes24) {
  return throwError(
    () => ({ response: { status, data: body } }) as AxiosError<ResponseYes24>,
  );
}

describe('Yes24BookSearchService', () => {
  let service: Yes24BookSearchService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Yes24BookSearchService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: () => 'fake-api-key' },
        },
      ],
    }).compile();

    service = module.get(Yes24BookSearchService);
  });

  it('ISBN13 상세(detail=Y)를 조회해 페이지 수와 상품 링크를 돌려준다', async () => {
    httpService.get.mockReturnValue(fakeResponse([fakeItem()]));

    const result = await service.getByIsbn('9788966260959');

    expect(result).toEqual({
      totalPage: 584,
      url: 'https://www.yes24.com/product/goods/11681152',
    });
    expect(httpService.get).toHaveBeenCalledWith(
      'https://apis.yes24.com/v1/goods/itemDetail',
      {
        // pages는 detail=Y일 때만 온다.
        params: { searchType: 'ISBN13', query: '9788966260959', detail: 'Y' },
        headers: { 'X-Api-Key': 'fake-api-key' },
      },
    );
  });

  it('ISBN이 다른 상품만 오면 NotFoundException을 던진다', async () => {
    httpService.get.mockReturnValue(
      fakeResponse([fakeItem({ isbn13: '9788966262724' })]),
    );

    await expect(service.getByIsbn('9788966260959')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('상품 없음(HTTP 404, GOODS_002)은 NotFoundException으로 변환한다', async () => {
    // 2026-10-15 9788924183429로 호출했을 때의 실제 응답.
    httpService.get.mockReturnValue(
      fakeHttpError(404, {
        success: false,
        message: 'ISBN13에 해당하는 상품을 찾을 수 없습니다.',
        data: null,
        errorCode: 'GOODS_002',
      }),
    );

    await expect(service.getByIsbn('9788924183429')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('인증 실패(HTTP 401, AUTH_001)는 "책 없음"으로 삼키지 않고 BadGatewayException으로 변환한다', async () => {
    // 2026-10-15 키 없이 호출했을 때의 실제 응답. 404로 바꾸면 키 누락이 로그 없이 가려진다.
    httpService.get.mockReturnValue(
      fakeHttpError(401, {
        success: false,
        message: 'API Key 값이 없습니다.',
        data: null,
        errorCode: 'AUTH_001',
      }),
    );

    await expect(service.getByIsbn('9788966260959')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('응답 없이 실패하면(타임아웃 등) BadGatewayException으로 변환한다', async () => {
    httpService.get.mockReturnValue(throwError(() => ({}) as AxiosError));

    await expect(service.getByIsbn('9788966260959')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('HTTP 200이어도 success가 false면 BadGatewayException으로 변환한다', async () => {
    httpService.get.mockReturnValue(
      of(
        fakeAxiosResponse<ResponseYes24>({
          success: false,
          message: '오류',
          data: null,
          errorCode: 'SYS_001',
        }),
      ),
    );

    await expect(service.getByIsbn('9788966260959')).rejects.toThrow(
      BadGatewayException,
    );
  });
});
