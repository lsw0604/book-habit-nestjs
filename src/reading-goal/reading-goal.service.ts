import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaErrorUtil } from '../common';
import { CreateReadingGoalDto } from './dto/create-reading-goal.dto';
import { UpdateReadingGoalDto } from './dto/update-reading-goal.dto';

@Injectable()
export class ReadingGoalService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(userId: number, dto: CreateReadingGoalDto) {
    try {
      return await this.prismaService.readingGoal.create({
        data: { ...dto, userId },
      });
    } catch (error) {
      if (PrismaErrorUtil.isUniqueConstraintViolation(error, 'userId')) {
        throw new ConflictException('이미 등록된 독서 목표입니다.');
      }
      throw error;
    }
  }

  async findAll(userId: number, year?: number, month?: number) {
    const where: Prisma.ReadingGoalWhereInput = {
      userId,
      ...(year !== undefined && { year }),
      ...(month !== undefined && { month }),
    };

    return this.prismaService.readingGoal.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'asc' }],
    });
  }

  async findOne(userId: number, id: number) {
    const readingGoal = await this.prismaService.readingGoal.findFirst({
      where: { id, userId },
    });

    if (!readingGoal) {
      throw new NotFoundException('독서 목표를 찾을 수 없습니다.');
    }

    return readingGoal;
  }

  async update(userId: number, id: number, dto: UpdateReadingGoalDto) {
    await this.findOne(userId, id);

    return this.prismaService.readingGoal.update({
      where: { id, userId },
      data: { ...dto },
    });
  }

  async remove(userId: number, id: number) {
    try {
      await this.prismaService.readingGoal.delete({ where: { id, userId } });
    } catch (error) {
      if (PrismaErrorUtil.isRecordNotFound(error)) {
        throw new NotFoundException('독서 목표를 찾을 수 없습니다.');
      }
      throw error;
    }
  }
}
