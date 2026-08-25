import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewCommentService } from './review-comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookReviewService } from '../my-book-review/my-book-review.service';
import {
  createPrismaError,
  firstCallArg,
} from '../common/testing/test-helpers';

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
      prismaService.reviewComment.create.mockResolvedValue({ id: 1 });

      await service.create(1, { myBookReviewId: 1, comment: '좋아요' });

      expect(myBookReviewService.assertAccessible).toHaveBeenCalledWith(1, 1);
      expect(prismaService.reviewComment.create).toHaveBeenCalledWith({
        data: { myBookReviewId: 1, comment: '좋아요', userId: 1 },
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

  describe('findOne', () => {
    it('로그인한 유저면 OR에 본인 소유 조건을 포함한다', async () => {
      prismaService.reviewComment.findFirst.mockResolvedValue({ id: 1 });

      await service.findOne(1, 1);

      const args = firstCallArg(prismaService.reviewComment.findFirst) as {
        where: { myBookReview: { OR: unknown[] } };
      };
      expect(args.where.myBookReview.OR).toEqual([
        { isPublic: true },
        { myBook: { userId: 1 } },
      ]);
    });

    it('비로그인(userId undefined)이면 본인 소유 조건을 OR에서 완전히 제외한다', async () => {
      prismaService.reviewComment.findFirst.mockResolvedValue({ id: 1 });

      await service.findOne(undefined, 1);

      const args = firstCallArg(prismaService.reviewComment.findFirst) as {
        where: { myBookReview: { OR: unknown[] } };
      };
      expect(args.where.myBookReview.OR).toEqual([{ isPublic: true }]);
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

      expect(prismaService.reviewComment.update).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        data: { comment: '수정' },
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
