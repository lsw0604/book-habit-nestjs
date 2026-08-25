import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewLikeService } from './review-like.service';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookReviewService } from '../my-book-review/my-book-review.service';

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

describe('ReviewLikeService', () => {
  let service: ReviewLikeService;
  let prismaService: {
    reviewLike: { create: jest.Mock; deleteMany: jest.Mock };
  };
  let myBookReviewService: { assertAccessible: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      reviewLike: { create: jest.fn(), deleteMany: jest.fn() },
    };
    myBookReviewService = { assertAccessible: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewLikeService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MyBookReviewService, useValue: myBookReviewService },
      ],
    }).compile();

    service = module.get(ReviewLikeService);
  });

  describe('create', () => {
    it('대상 리뷰에 접근 가능한지 먼저 확인한 뒤 좋아요를 생성한다', async () => {
      myBookReviewService.assertAccessible.mockResolvedValue({ id: 1 });
      prismaService.reviewLike.create.mockResolvedValue({
        id: 1,
        userId: 1,
        myBookReviewId: 1,
      });

      await service.create(1, { myBookReviewId: 1 });

      expect(myBookReviewService.assertAccessible).toHaveBeenCalledWith(1, 1);
      expect(prismaService.reviewLike.create).toHaveBeenCalledWith({
        data: { userId: 1, myBookReviewId: 1 },
      });
    });

    it('비공개로 전환된 등 접근 불가한 리뷰면 좋아요 생성 전에 예외가 전파된다', async () => {
      myBookReviewService.assertAccessible.mockRejectedValue(
        new NotFoundException('한줄평을 찾을 수 없습니다.'),
      );

      await expect(service.create(1, { myBookReviewId: 1 })).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.reviewLike.create).not.toHaveBeenCalled();
    });

    it('이미 좋아요를 눌렀으면(P2002) ConflictException을 던진다', async () => {
      myBookReviewService.assertAccessible.mockResolvedValue({ id: 1 });
      prismaService.reviewLike.create.mockRejectedValue(
        createPrismaError('P2002', { target: ['myBookReviewId'] }),
      );

      await expect(service.create(1, { myBookReviewId: 1 })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('삭제된 행이 없으면 NotFoundException을 던진다', async () => {
      prismaService.reviewLike.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('본인 좋아요면 삭제한다', async () => {
      prismaService.reviewLike.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.remove(1, 1)).resolves.toBeUndefined();
      expect(prismaService.reviewLike.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, myBookReviewId: 1 },
      });
    });
  });
});
