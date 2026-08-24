import { Module } from '@nestjs/common';
import { MyBookTagService } from './my-book-tag.service';
import { MyBookTagController } from './my-book-tag.controller';
import { TagModule } from '../tag/tag.module';
import { MyBookModule } from '../my-book/my-book.module';

@Module({
  imports: [TagModule, MyBookModule],
  controllers: [MyBookTagController],
  providers: [MyBookTagService],
})
export class MyBookTagModule {}
