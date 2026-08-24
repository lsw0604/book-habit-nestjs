import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuoteService {
  constructor(private readonly prismaService: PrismaService) {}

  private async assertReadingLogOwnership(
    userId: number,
    readingLogId: number,
  ) {
    const readingLog = await this.prismaService.readingLog.findFirst({
      where: { id: readingLogId, myBook: { userId } },
      select: { id: true },
    });

    if (!readingLog) {
      throw new NotFoundException('독서 기록을 찾을 수 없습니다.');
    }
  }

  async create(userId: number, dto: CreateQuoteDto) {
    await this.assertReadingLogOwnership(userId, dto.readingLogId);
    return this.prismaService.quote.create({ data: { ...dto } });
  }

  async findAll(userId: number, readingLogId: number) {
    await this.assertReadingLogOwnership(userId, readingLogId);

    return this.prismaService.quote.findMany({
      where: { readingLogId },
      orderBy: { page: 'asc' },
    });
  }

  async findOne(userId: number, id: number) {
    const quote = await this.prismaService.quote.findFirst({
      where: { id, readingLog: { myBook: { userId } } },
    });

    if (!quote) {
      throw new NotFoundException('인용구를 찾을 수 없습니다.');
    }

    return quote;
  }

  async update(userId: number, id: number, dto: UpdateQuoteDto) {
    await this.findOne(userId, id);

    return this.prismaService.quote.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    await this.prismaService.quote.delete({ where: { id } });
  }
}
