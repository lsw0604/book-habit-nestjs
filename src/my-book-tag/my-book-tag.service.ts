import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TagService } from '../tag/tag.service';
import { MyBookService } from '../my-book/my-book.service';
import { PrismaErrorUtil } from '../common';
import { CreateMyBookTagDto } from './dto/create-my-book-tag.dto';
import { MyBookTagSelect } from './my-book-tag.constants';

@Injectable()
export class MyBookTagService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tagService: TagService,
    private readonly myBookService: MyBookService,
  ) {}

  async create(userId: number, dto: CreateMyBookTagDto) {
    await this.myBookService.assertOwnership(userId, dto.myBookId);
    const tag = await this.tagService.findOrCreate(dto.tagValue);

    try {
      return await this.prismaService.myBookTag.create({
        data: { myBookId: dto.myBookId, tagId: tag.id },
        select: MyBookTagSelect,
      });
    } catch (error) {
      if (PrismaErrorUtil.isUniqueConstraintViolation(error, 'tagId')) {
        throw new ConflictException('이미 등록된 태그입니다.');
      }
      throw error;
    }
  }

  async findAll(userId: number, myBookId: number) {
    await this.myBookService.assertOwnership(userId, myBookId);

    return this.prismaService.myBookTag.findMany({
      where: { myBookId },
      select: MyBookTagSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(userId: number, id: number) {
    const existing = await this.prismaService.myBookTag.findFirst({
      where: { id, myBook: { userId } },
    });

    if (!existing) {
      throw new NotFoundException('태그를 찾을 수 없습니다.');
    }

    await this.prismaService.myBookTag.delete({ where: { id } });
  }
}
