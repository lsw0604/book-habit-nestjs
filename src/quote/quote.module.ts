import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { MyBookModule } from '../my-book/my-book.module';

@Module({
  imports: [MyBookModule],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}
