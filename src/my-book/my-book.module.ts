import { Module } from '@nestjs/common';
import { MyBookService } from './my-book.service';
import { MyBookController } from './my-book.controller';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [BooksModule],
  controllers: [MyBookController],
  providers: [MyBookService],
  exports: [MyBookService],
})
export class MyBookModule {}
