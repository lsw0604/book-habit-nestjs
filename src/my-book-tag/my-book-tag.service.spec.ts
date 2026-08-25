import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MyBookTagService } from './my-book-tag.service';
import { PrismaService } from '../prisma/prisma.service';
import { TagService } from '../tag/tag.service';
import { MyBookService } from '../my-book/my-book.service';

function createPrismaError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mock prisma error', {
    code,
    clientVersion: '6.12.0',
    meta,
  });
}

describe('MyBookTagService', () => {
  let service: MyBookTagService;
  let prismaService: {
    myBookTag: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };
  let tagService: { findOrCreate: jest.Mock };
  let myBookService: { assertOwnership: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      myBookTag: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    tagService = { findOrCreate: jest.fn() };
    myBookService = { assertOwnership: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyBookTagService,
        { provide: PrismaService, useValue: prismaService },
        { provide: TagService, useValue: tagService },
        { provide: MyBookService, useValue: myBookService },
      ],
    }).compile();

    service = module.get(MyBookTagService);
  });

  describe('create', () => {
    it('소유권을 확인하고 태그를 findOrCreate한 뒤 연결한다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      tagService.findOrCreate.mockResolvedValue({ id: 10, value: '자기계발' });
      prismaService.myBookTag.create.mockResolvedValue({
        id: 1,
        myBookId: 1,
        tag: { id: 10, value: '자기계발' },
      });

      await service.create(1, { myBookId: 1, tagValue: '자기계발' });

      expect(myBookService.assertOwnership).toHaveBeenCalledWith(1, 1);
      expect(tagService.findOrCreate).toHaveBeenCalledWith('자기계발');
      const [[createArgs]] = prismaService.myBookTag.create.mock.calls as [
        [{ data: { myBookId: number; tagId: number } }],
      ];
      expect(createArgs.data).toEqual({ myBookId: 1, tagId: 10 });
    });

    it('이미 등록된 태그면(P2002) ConflictException을 던진다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      tagService.findOrCreate.mockResolvedValue({ id: 10, value: '자기계발' });
      prismaService.myBookTag.create.mockRejectedValue(
        createPrismaError('P2002', { target: ['tagId'] }),
      );

      await expect(
        service.create(1, { myBookId: 1, tagValue: '자기계발' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('소유권을 확인한 뒤 목록을 조회한다', async () => {
      myBookService.assertOwnership.mockResolvedValue({
        book: { totalPage: 300 },
      });
      prismaService.myBookTag.findMany.mockResolvedValue([]);

      await service.findAll(1, 1);

      expect(myBookService.assertOwnership).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('remove', () => {
    it('본인 소유가 아니면 NotFoundException을 던지고 삭제하지 않는다', async () => {
      prismaService.myBookTag.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
      expect(prismaService.myBookTag.delete).not.toHaveBeenCalled();
    });

    it('본인 소유면 삭제한다', async () => {
      prismaService.myBookTag.findFirst.mockResolvedValue({ id: 1 });

      await service.remove(1, 1);

      expect(prismaService.myBookTag.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
