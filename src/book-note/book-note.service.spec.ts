import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookNoteService } from './book-note.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';
import { callWhere } from '../common/testing/test-helpers';

const CREATED_AT = new Date('2026-10-20T00:00:00.000Z');

function fakeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    myBookId: 1,
    template: 'BON_KKAE_JEOK',
    sections: [],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

describe('BookNoteService', () => {
  let service: BookNoteService;
  let prismaService: {
    bookNote: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    bookNoteSection: { deleteMany: jest.Mock; upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let myBookService: { assertOwnership: jest.Mock };
  /** 트랜잭션 안에서 일어난 호출 순서(모델.메서드). */
  let calls: string[];

  beforeEach(async () => {
    calls = [];
    const track = (
      name: string,
      impl: (...args: unknown[]) => unknown = () => undefined,
    ) =>
      jest.fn((...args: unknown[]) => {
        calls.push(name);
        return impl(...args);
      });

    prismaService = {
      bookNote: {
        findFirst: jest.fn(),
        findUnique: track('bookNote.findUnique', () => null),
        findUniqueOrThrow: track('bookNote.findUniqueOrThrow', () =>
          fakeNote(),
        ),
        upsert: track('bookNote.upsert', () => ({ id: 10 })),
        deleteMany: jest.fn(),
      },
      bookNoteSection: {
        deleteMany: track('bookNoteSection.deleteMany'),
        upsert: track('bookNoteSection.upsert'),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
        fn(prismaService),
      ),
    };
    myBookService = { assertOwnership: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookNoteService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MyBookService, useValue: myBookService },
      ],
    }).compile();

    service = module.get(BookNoteService);
  });

  describe('findTemplates', () => {
    it('모든 템플릿을 섹션 정의와 함께 돌려준다', () => {
      const templates = service.findTemplates();

      expect(templates.map(({ template }) => template)).toEqual([
        'ONE_SENTENCE',
        'BON_KKAE_JEOK',
        'KWL',
        'THREE_TWO_ONE',
        'FREE',
      ]);
      expect(
        templates
          .filter(({ recommended }) => recommended)
          .map((t) => t.template),
      ).toEqual(['ONE_SENTENCE']);
    });
  });

  describe('findByMyBookId', () => {
    it('myBook.userId로 소유권을 걸어 조회한다', async () => {
      prismaService.bookNote.findFirst.mockResolvedValue(null);

      await service.findByMyBookId(7, 1);

      expect(callWhere(prismaService.bookNote.findFirst)).toEqual({
        myBookId: 1,
        myBook: { userId: 7 },
      });
    });

    it('노트가 없거나 남의 것이면 null이다', async () => {
      prismaService.bookNote.findFirst.mockResolvedValue(null);

      await expect(service.findByMyBookId(7, 1)).resolves.toBeNull();
    });

    it('템플릿의 모든 섹션을 정의 순서대로 채워 돌려준다', async () => {
      const updatedAt = new Date('2026-10-21T00:00:00.000Z');
      prismaService.bookNote.findFirst.mockResolvedValue(
        fakeNote({
          sections: [{ key: 'apply', content: '매일 10쪽', updatedAt }],
        }),
      );

      const result = await service.findByMyBookId(7, 1);

      expect(result?.sections).toEqual([
        { key: 'seen', label: '본 것', content: '', updatedAt: null },
        { key: 'realized', label: '깨달은 것', content: '', updatedAt: null },
        { key: 'apply', label: '적용할 것', content: '매일 10쪽', updatedAt },
      ]);
    });
  });

  describe('upsert', () => {
    it('소유권을 먼저 확인하고, 실패하면 DB에 쓰지 않는다', async () => {
      myBookService.assertOwnership.mockRejectedValue(new NotFoundException());

      await expect(
        service.upsert(7, 1, { template: 'BON_KKAE_JEOK', sections: [] }),
      ).rejects.toThrow(NotFoundException);
      expect(myBookService.assertOwnership).toHaveBeenCalledWith(7, 1);
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('섹션 검증에 실패하면 트랜잭션을 시작하지 않는다(400)', async () => {
      await expect(
        service.upsert(7, 1, {
          template: 'BON_KKAE_JEOK',
          sections: [{ key: 'learned', content: 'KWL의 섹션' }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('myBookId로 노트를 upsert하고, 값이 있는 섹션은 (bookNoteId, key)로 upsert한다', async () => {
      await service.upsert(7, 1, {
        template: 'BON_KKAE_JEOK',
        sections: [{ key: 'seen', content: '핵심' }],
      });

      expect(prismaService.bookNote.upsert).toHaveBeenCalledWith({
        where: { myBookId: 1 },
        create: { myBookId: 1, template: 'BON_KKAE_JEOK' },
        update: { template: 'BON_KKAE_JEOK' },
        select: { id: true },
      });
      expect(prismaService.bookNoteSection.upsert).toHaveBeenCalledWith({
        where: { bookNoteId_key: { bookNoteId: 10, key: 'seen' } },
        create: { bookNoteId: 10, key: 'seen', content: '핵심' },
        update: { content: '핵심' },
      });
    });

    it('비운 섹션은 행을 지우고, 보내지 않은 섹션은 건드리지 않는다', async () => {
      prismaService.bookNote.findUnique.mockReturnValue({
        template: 'BON_KKAE_JEOK',
      });

      await service.upsert(7, 1, {
        template: 'BON_KKAE_JEOK',
        sections: [
          { key: 'seen', content: ' ' },
          { key: 'apply', content: '실천' },
        ],
      });

      expect(prismaService.bookNoteSection.deleteMany).toHaveBeenCalledTimes(1);
      expect(callWhere(prismaService.bookNoteSection.deleteMany)).toEqual({
        bookNoteId: 10,
        key: { in: ['seen'] },
      });
      expect(prismaService.bookNoteSection.upsert).toHaveBeenCalledTimes(1);
      // 'realized'는 요청에 없으므로 어떤 호출에도 나타나지 않는다.
      expect(
        JSON.stringify(prismaService.bookNoteSection.upsert.mock.calls),
      ).not.toContain('realized');
    });

    it('템플릿이 바뀌면 기존 섹션을 모두 지운 뒤 새 섹션을 쓴다', async () => {
      prismaService.bookNote.findUnique.mockReturnValue({
        template: 'ONE_SENTENCE',
      });

      await service.upsert(7, 1, {
        template: 'BON_KKAE_JEOK',
        sections: [{ key: 'seen', content: '핵심' }],
      });

      expect(callWhere(prismaService.bookNoteSection.deleteMany)).toEqual({
        bookNoteId: 10,
      });
      expect(calls.indexOf('bookNoteSection.deleteMany')).toBeLessThan(
        calls.indexOf('bookNoteSection.upsert'),
      );
    });

    it('템플릿이 같으면 섹션 전체 삭제를 하지 않는다', async () => {
      prismaService.bookNote.findUnique.mockReturnValue({
        template: 'BON_KKAE_JEOK',
      });

      await service.upsert(7, 1, {
        template: 'BON_KKAE_JEOK',
        sections: [{ key: 'seen', content: '핵심' }],
      });

      expect(prismaService.bookNoteSection.deleteMany).not.toHaveBeenCalled();
    });

    it('처음 만드는 노트는 섹션 전체 삭제를 하지 않는다', async () => {
      await service.upsert(7, 1, {
        template: 'KWL',
        sections: [{ key: 'know', content: '조금 안다' }],
      });

      expect(prismaService.bookNoteSection.deleteMany).not.toHaveBeenCalled();
    });

    it('저장한 결과를 다시 읽어 응답 형태로 돌려준다', async () => {
      prismaService.bookNote.findUniqueOrThrow.mockReturnValue(
        fakeNote({ template: 'ONE_SENTENCE' }),
      );

      const result = await service.upsert(7, 1, {
        template: 'ONE_SENTENCE',
        sections: [],
      });

      expect(result).toEqual({
        myBookId: 1,
        template: 'ONE_SENTENCE',
        sections: [
          { key: 'summary', label: '한 문장', content: '', updatedAt: null },
          {
            key: 'reason',
            label: '그렇게 생각한 이유',
            content: '',
            updatedAt: null,
          },
        ],
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      });
    });
  });

  describe('remove', () => {
    it('myBook.userId로 소유권을 걸어 지운다', async () => {
      prismaService.bookNote.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove(7, 1);

      expect(callWhere(prismaService.bookNote.deleteMany)).toEqual({
        myBookId: 1,
        myBook: { userId: 7 },
      });
    });

    it('지운 것이 없으면(없거나 남의 것) NotFoundException을 던진다', async () => {
      prismaService.bookNote.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(7, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
