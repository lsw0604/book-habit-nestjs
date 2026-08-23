import { Module } from '@nestjs/common';
import { ReadingLogService } from './reading-log.service';
import { ReadingLogController } from './reading-log.controller';
import { MyBookModule } from '../my-book/my-book.module';

@Module({
  imports: [MyBookModule],
  controllers: [ReadingLogController],
  providers: [ReadingLogService],
})
export class ReadingLogModule {}
