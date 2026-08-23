import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaErrorUtil } from '../common';
import { MyBookReviewService } from '../my-book-review/my-book-review.service';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { UpdateReviewCommentDto } from './dto/update-review-comment.dto';

@Injectable()
export class ReviewCommentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly myBookReviewService: MyBookReviewService,
  ) {}

  async create(userId: number, dto: CreateReviewCommentDto) {
    await this.myBookReviewService.assertAccessible(userId, dto.myBookReviewId);

    return this.prismaService.reviewComment.create({
      data: { ...dto, userId },
    });
  }

  async findAll(userId: number | undefined, myBookReviewId: number) {
    await this.myBookReviewService.assertAccessible(userId, myBookReviewId);

    return this.prismaService.reviewComment.findMany({
      where: { myBookReviewId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * userId가 없으면(비로그인) "본인 소유" 분기를 OR에서 뺀다 —
   * MyBookReviewService.accessibleOr와 같은 이유(Prisma undefined 필터 함정).
   */
  async findOne(userId: number | undefined, id: number) {
    const comment = await this.prismaService.reviewComment.findFirst({
      where: {
        id,
        myBookReview: {
          OR: [
            { isPublic: true },
            ...(userId !== undefined ? [{ myBook: { userId } }] : []),
          ],
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    return comment;
  }

  async update(userId: number, id: number, dto: UpdateReviewCommentDto) {
    try {
      return await this.prismaService.reviewComment.update({
        where: { id, userId },
        data: { ...dto },
      });
    } catch (error) {
      if (PrismaErrorUtil.isRecordNotFound(error)) {
        throw new NotFoundException('댓글을 찾을 수 없습니다.');
      }
      throw error;
    }
  }

  async remove(userId: number, id: number) {
    try {
      await this.prismaService.reviewComment.delete({ where: { id, userId } });
    } catch (error) {
      if (PrismaErrorUtil.isRecordNotFound(error)) {
        throw new NotFoundException('댓글을 찾을 수 없습니다.');
      }
      throw error;
    }
  }
}
