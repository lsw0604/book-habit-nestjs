import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewCommentService } from './review-comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookReviewService } from '../my-book-review/my-book-review.service';
import {
  callData,
  callWhere,
  createPrismaError,
  firstCallArg,
} from '../common/testing/test-helpers';

function fakeCommentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    myBookReviewId: 1,
    comment: '좋아요',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: { id: 5, name: '홍길동', profile: null },
    ...overrides,
  };
}

describe('ReviewCommentService', () => {
  let service: ReviewCommentService;
  let prismaService: {
    reviewComment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let myBookReviewService: { assertAccessible: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      reviewComment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    myBookReviewService = { assertAccessible: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewCommentService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MyBookReviewService, useValue: myBookReviewService },
      ],
    }).compile();

    service = module.get(ReviewCommentService);
  });

  describe('create', () => {
    it('대상 리뷰에 접근 가능한지 먼저 확인한 뒤 댓글을 생성한다', async () => {
      myBookReviewService.assertAccessible.mockResolvedValue({ id: 1 });
      prismaService.reviewComment.create.mockResolvedValue(fakeCommentRow());

      await service.create(1, { myBookReviewId: 1, comment: '좋아요' });

      expect(myBookReviewService.assertAccessible).toHaveBeenCalledWith(1, 1);
      expect(callData(prismaService.reviewComment.create)).toEqual({
        myBookReviewId: 1,
        comment: '좋아요',
        userId: 1,
      });
    });

    it('접근 불가한 리뷰면 댓글 생성 전에 예외가 전파된다', async () => {
      myBookReviewService.assertAccessible.mockRejectedValue(
        new NotFoundException('한줄평을 찾을 수 없습니다.'),
      );

      await expect(
        service.create(1, { myBookReviewId: 1, comment: '좋아요' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.reviewComment.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('대상 리뷰에 접근 가능한지 먼저 확인한 뒤 목록을 조회한다', async () => {
      myBookReviewService.assertAccessible.mockResolvedValue({ id: 1 });
      prismaService.reviewComment.findMany.mockResolvedValue([]);

      await service.findAll(undefined, 1);

      expect(myBookReviewService.assertAccessible).toHaveBeenCalledWith(
        undefined,
        1,
      );
    });
  });

  // 댓글 목록에 작성자 이름/프로필을 그려야 하므로 user 관계를 author로 노출한다.
  // 단 User에는 password/email이 있어, select를 명시하지 않으면 그대로 새어나간다.
  describe('작성자(author) 노출', () => {
    const selectedUserFields = { id: true, name: true, profile: true };

    it.each([
      ['create', () => service.create(1, { myBookReviewId: 1, comment: 'ㅋ' })],
      ['findOne', () => service.findOne(1, 1)],
      ['update', () => service.update(1, 1, { comment: '수정' })],
    ])('%s는 user에서 안전한 필드만 select한다', async (_name, call) => {
      myBookReviewService.assertAccessible.mockResolvedValue({ id: 1 });
      prismaService.reviewComment.create.mockResolvedValue(fakeCommentRow());
      prismaService.reviewComment.findFirst.mockResolvedValue(fakeCommentRow());
      prismaService.reviewComment.update.mockResolvedValue(fakeCommentRow());

      await call();

      const mocks = [
        prismaService.reviewComment.create,
        prismaService.reviewComment.findFirst,
        prismaService.reviewComment.update,
      ];
      const called = mocks.find((m) => m.mock.calls.length > 0)!;
      const args = firstCallArg(called) as {
        select: { user: { select: Record<string, boolean> } };
      };
      expect(args.select.user.select).toEqual(selectedUserFields);
      // password/email이 select에 섞이면 응답으로 새어나간다.
      expect(args.select.user.select).not.toHaveProperty('password');
      expect(args.select.user.select).not.toHaveProperty('email');
    });

    it('findAll도 user를 안전한 필드로만 select한다', async () => {
      myBookReviewService.assertAccessible.mockResolvedValue({ id: 1 });
      prismaService.reviewComment.findMany.mockResolvedValue([]);

      await service.findAll(1, 1);

      const args = firstCallArg(prismaService.reviewComment.findMany) as {
        select: { user: { select: Record<string, boolean> } };
      };
      expect(args.select.user.select).toEqual(selectedUserFields);
    });

    it('user를 author로 매핑하고 raw userId는 응답에 넣지 않는다', async () => {
      myBookReviewService.assertAccessible.mockResolvedValue({ id: 1 });
      prismaService.reviewComment.findMany.mockResolvedValue([
        fakeCommentRow(),
      ]);

      const [comment] = await service.findAll(1, 1);

      expect(comment.author).toEqual({ id: 5, name: '홍길동', profile: null });
      expect(comment).not.toHaveProperty('user');
      // 내 댓글 여부는 author.id로 판별하므로 raw userId는 불필요하다.
      expect(comment).not.toHaveProperty('userId');
    });
  });

  describe('findOne', () => {
    it('로그인한 유저면 OR에 본인 소유 조건을 포함한다', async () => {
      prismaService.reviewComment.findFirst.mockResolvedValue({ id: 1 });

      await service.findOne(1, 1);

      const where = callWhere(prismaService.reviewComment.findFirst) as {
        myBookReview: { OR: unknown[] };
      };
      expect(where.myBookReview.OR).toEqual([
        { isPublic: true },
        { myBook: { userId: 1 } },
      ]);
    });

    it('비로그인(userId undefined)이면 본인 소유 조건을 OR에서 완전히 제외한다', async () => {
      prismaService.reviewComment.findFirst.mockResolvedValue({ id: 1 });

      await service.findOne(undefined, 1);

      const where = callWhere(prismaService.reviewComment.findFirst) as {
        myBookReview: { OR: unknown[] };
      };
      expect(where.myBookReview.OR).toEqual([{ isPublic: true }]);
    });

    it('접근할 수 없으면 NotFoundException을 던진다', async () => {
      prismaService.reviewComment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('본인 댓글이 아니면(P2025) NotFoundException을 던진다', async () => {
      prismaService.reviewComment.update.mockRejectedValue(
        createPrismaError('P2025'),
      );

      await expect(service.update(1, 999, { comment: '수정' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('본인 댓글이면 수정한다', async () => {
      prismaService.reviewComment.update.mockResolvedValue({
        id: 1,
        comment: '수정',
      });

      await service.update(1, 1, { comment: '수정' });

      // where에 userId가 있어야 남의 댓글을 수정할 수 없다.
      expect(callWhere(prismaService.reviewComment.update)).toEqual({
        id: 1,
        userId: 1,
      });
      expect(callData(prismaService.reviewComment.update)).toEqual({
        comment: '수정',
      });
    });
  });

  describe('remove', () => {
    it('본인 댓글이 아니면(P2025) NotFoundException을 던진다', async () => {
      prismaService.reviewComment.delete.mockRejectedValue(
        createPrismaError('P2025'),
      );

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('본인 댓글이면 삭제한다', async () => {
      prismaService.reviewComment.delete.mockResolvedValue({ id: 1 });

      await service.remove(1, 1);

      expect(prismaService.reviewComment.delete).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
    });
  });
});
