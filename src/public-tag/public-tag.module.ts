import { Module } from '@nestjs/common';
import { PublicTagService } from './public-tag.service';
import { PublicTagController } from './public-tag.controller';

@Module({
  controllers: [PublicTagController],
  providers: [PublicTagService],
})
export class PublicTagModule {}
