import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaErrorUtil } from '../common';
import { MyBookReviewService } from '../my-book-review/my-book-review.service';
import { CreateReviewLikeDto } from './dto/create-review-like.dto';

@Injectable()
export class ReviewLikeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly myBookReviewService: MyBookReviewService,
  ) {}

  async create(userId: number, dto: CreateReviewLikeDto) {
    await this.myBookReviewService.assertAccessible(userId, dto.myBookReviewId);

    try {
      return await this.prismaService.reviewLike.create({
        data: { userId, myBookReviewId: dto.myBookReviewId },
      });
    } catch (error) {
      if (
        PrismaErrorUtil.isUniqueConstraintViolation(error, 'myBookReviewId')
      ) {
        throw new ConflictException('이미 좋아요를 눌렀습니다.');
      }
      throw error;
    }
  }

  async remove(userId: number, myBookReviewId: number) {
    const { count } = await this.prismaService.reviewLike.deleteMany({
      where: { userId, myBookReviewId },
    });

    if (count === 0) {
      throw new NotFoundException('좋아요를 찾을 수 없습니다.');
    }
  }
}
