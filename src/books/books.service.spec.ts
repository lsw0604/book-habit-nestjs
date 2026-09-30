import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { AladinBookSearchService } from './providers';
import { createPrismaError } from '../common/testing/test-helpers';

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

  describe('findDetailByIsbn', () => {
    const localBook = {
      id: 1,
      isbn: '9788996991342',
      title: '미움받을 용기',
      subTitle: null,
      authors: ['기시미 이치로', '고가 후미타케'],
      translators: ['전경아'],
      publisher: '인플루엔셜',
      thumbnail: 'https://example.com/thumb.jpg',
      coverImage: 'https://example.com/cover.jpg',
      description: '소개',
      url: 'https://example.com/book',
      pubDate: new Date('2014-11-17T00:00:00.000Z'),
      totalPage: 336,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('DB에 있으면 외부 API를 호출하지 않고 DB의 Book으로 응답한다', async () => {
      prismaService.book.findUnique.mockResolvedValue(localBook);

      const result = await service.findDetailByIsbn('9788996991342');

      expect(prismaService.book.findUnique).toHaveBeenCalledWith({
        where: { isbn: '9788996991342' },
      });
      expect(aladinBookSearchService.getByIsbn).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        isbn: '9788996991342',
        title: '미움받을 용기',
        totalPage: 336,
      });
    });

    it('DB에 없으면 외부에서 조회해 응답하되 저장하지는 않는다', async () => {
      prismaService.book.findUnique.mockResolvedValue(null);
      aladinBookSearchService.getByIsbn.mockResolvedValue({
        isbn: '9788996991342',
        title: '미움받을 용기',
        authors: ['기시미 이치로'],
        translators: [],
      });

      const result = await service.findDetailByIsbn('9788996991342');

      expect(result).toMatchObject({
        isbn: '9788996991342',
        title: '미움받을 용기',
        authors: ['기시미 이치로'],
      });
      // GET은 부작용이 없어야 한다 - Book은 서재 등록(findOrCreate) 때만 저장한다.
      expect(prismaService.book.upsert).not.toHaveBeenCalled();
    });

    it('DB에도 없고 외부에서도 못 찾으면 NotFoundException을 던진다', async () => {
      prismaService.book.findUnique.mockResolvedValue(null);
      aladinBookSearchService.getByIsbn.mockResolvedValue({ isbn: '' });

      await expect(service.findDetailByIsbn('0000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('내부 값(id/createdAt/updatedAt)은 응답에 포함하지 않는다', async () => {
      prismaService.book.findUnique.mockResolvedValue(localBook);

      const result = await service.findDetailByIsbn('9788996991342');

      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
    });

    it('Json 컬럼인 authors/translators가 문자열 배열이 아니면 걸러낸다', async () => {
      prismaService.book.findUnique.mockResolvedValue({
        ...localBook,
        authors: ['기시미 이치로', 1, null],
        translators: null,
      });

      const result = await service.findDetailByIsbn('9788996991342');

      expect(result.authors).toEqual(['기시미 이치로']);
      expect(result.translators).toEqual([]);
    });
  });
});
