import { Module } from '@nestjs/common';
import { BookNoteService } from './book-note.service';
import { BookNoteController } from './book-note.controller';
import { MyBookModule } from '../my-book/my-book.module';

@Module({
  imports: [MyBookModule],
  controllers: [BookNoteController],
  providers: [BookNoteService],
})
export class BookNoteModule {}
