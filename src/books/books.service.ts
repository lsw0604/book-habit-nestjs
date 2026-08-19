import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  public async findOrCreate(isbn: string) {
    const book = await this.prisma.book.findUnique({
      where: {
        isbn,
      },
    });

    if (book) return book;
  }
}
