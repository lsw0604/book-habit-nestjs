import { Module } from '@nestjs/common';
import { MyBookTagService } from './my-book-tag.service';
import { MyBookTagController } from './my-book-tag.controller';
import { TagModule } from '../tag/tag.module';

@Module({
  imports: [TagModule],
  controllers: [MyBookTagController],
  providers: [MyBookTagService],
})
export class MyBookTagModule {}
