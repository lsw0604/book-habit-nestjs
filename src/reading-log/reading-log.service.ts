import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReadingLogDto } from './dto/create-reading-log.dto';
import { UpdateReadingLogDto } from './dto/update-reading-log.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MyBookService } from '../my-book/my-book.service';

@Injectable()
export class ReadingLogService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly myBookService: MyBookService,
  ) {}

  private async assertMyBookOwnership(userId: number, myBookId: number) {
    const myBook = await this.prismaService.myBook.findFirst({
      where: { id: myBookId, userId },
    });

    if (!myBook) {
      throw new NotFoundException('서재 항목을 찾을 수 없습니다.');
    }
  }

  async create(userId: number, dto: CreateReadingLogDto) {
    await this.assertMyBookOwnership(userId, dto.myBookId);

    return this.prismaService.$transaction(async (tx) => {
      const readingLog = await tx.readingLog.create({ data: { ...dto } });
      await this.myBookService.startReadingIfWantToRead(dto.myBookId, tx);
      await this.myBookService.syncProgressFromLatestReadingLog(
        dto.myBookId,
        tx,
      );
      return readingLog;
    });
  }

  async findAll(userId: number, myBookId: number) {
    await this.assertMyBookOwnership(userId, myBookId);

    return this.prismaService.readingLog.findMany({
      where: { myBookId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: number, id: number) {
    const readingLog = await this.prismaService.readingLog.findFirst({
      where: { id, myBook: { userId } },
    });

    if (!readingLog) {
      throw new NotFoundException('독서 기록을 찾을 수 없습니다.');
    }

    return readingLog;
  }

  async update(userId: number, id: number, dto: UpdateReadingLogDto) {
    const existing = await this.findOne(userId, id);

    return this.prismaService.$transaction(async (tx) => {
      const readingLog = await tx.readingLog.update({
        where: { id },
        data: { ...dto },
      });
      await this.myBookService.syncProgressFromLatestReadingLog(
        existing.myBookId,
        tx,
      );
      return readingLog;
    });
  }

  async remove(userId: number, id: number) {
    const existing = await this.findOne(userId, id);

    await this.prismaService.$transaction(async (tx) => {
      await tx.readingLog.delete({ where: { id } });
      await this.myBookService.syncProgressFromLatestReadingLog(
        existing.myBookId,
        tx,
      );
    });
  }
}
