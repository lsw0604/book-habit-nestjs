import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { AladinBookSearchService } from './providers';

function createPrismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mock prisma error', {
    code,
    clientVersion: '6.12.0',
  });
}

describe('BooksService', () => {
  let service: BooksService;
  let prismaService: {
    book: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let aladinBookSearchService: { getByIsbn: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      book: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    aladinBookSearchService = { getByIsbn: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: prismaService },
        {
          provide: AladinBookSearchService,
          useValue: aladinBookSearchService,
        },
      ],
    }).compile();

    service = module.get(BooksService);
  });

  it('로컬 DB에 이미 있으면 외부 API를 호출하지 않고 그대로 반환한다', async () => {
    const local = { id: 1, isbn: '9788996991342' };
    prismaService.book.findUnique.mockResolvedValue(local);

    const result = await service.findOrCreate('9788996991342');

    expect(result).toBe(local);
    expect(aladinBookSearchService.getByIsbn).not.toHaveBeenCalled();
  });

  it('로컬에 없으면 외부 API로 조회 후 upsert해서 반환한다', async () => {
    prismaService.book.findUnique.mockResolvedValue(null);
    aladinBookSearchService.getByIsbn.mockResolvedValue({
      isbn: '9788996991342',
      title: '미움받을 용기',
    });
    prismaService.book.upsert.mockResolvedValue({
      id: 1,
      isbn: '9788996991342',
    });

    await service.findOrCreate('9788996991342');

    expect(prismaService.book.upsert).toHaveBeenCalledWith({
      where: { isbn: '9788996991342' },
      create: { isbn: '9788996991342', title: '미움받을 용기' },
      update: {},
    });
  });

  it('외부 API 응답에 isbn이 없으면 NotFoundException을 던진다', async () => {
    prismaService.book.findUnique.mockResolvedValue(null);
    aladinBookSearchService.getByIsbn.mockResolvedValue({
      isbn: '',
      title: '알 수 없음',
    });

    await expect(service.findOrCreate('0000000000000')).rejects.toThrow(
      NotFoundException,
    );
    expect(prismaService.book.upsert).not.toHaveBeenCalled();
  });

  it('동시 요청으로 유니크 충돌(P2002)이 나면 재조회해서 반환한다', async () => {
    prismaService.book.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, isbn: '9788996991342' });
    aladinBookSearchService.getByIsbn.mockResolvedValue({
      isbn: '9788996991342',
      title: '미움받을 용기',
    });
    prismaService.book.upsert.mockRejectedValue(createPrismaError('P2002'));

    const result = await service.findOrCreate('9788996991342');

    expect(result).toEqual({ id: 1, isbn: '9788996991342' });
  });

  it('P2002가 아닌 다른 에러는 그대로 전파한다', async () => {
    prismaService.book.findUnique.mockResolvedValue(null);
    aladinBookSearchService.getByIsbn.mockResolvedValue({
      isbn: '9788996991342',
      title: '미움받을 용기',
    });
    const otherError = new Error('boom');
    prismaService.book.upsert.mockRejectedValue(otherError);

    await expect(service.findOrCreate('9788996991342')).rejects.toThrow(
      otherError,
    );
  });
});
