import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateReadingGoalDto } from './create-reading-goal.dto';

// year/month/metric은 [userId, year, month, metric] 유니크 키를 이루는 식별자라
// 수정 대상에서 제외한다 - 값을 바꾸고 싶다면 삭제 후 재생성해야 한다.
export class UpdateReadingGoalDto extends PartialType(
  OmitType(CreateReadingGoalDto, ['year', 'month', 'metric'] as const),
) {}
