import { Module } from '@nestjs/common';
import { ReadingGoalService } from './reading-goal.service';
import { ReadingGoalController } from './reading-goal.controller';

@Module({
  controllers: [ReadingGoalController],
  providers: [ReadingGoalService],
})
export class ReadingGoalModule {}
