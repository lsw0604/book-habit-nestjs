import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';

// 책(myBookId)은 바꿀 수 없다. readingLogId는 다른 기록으로 다시 연결하거나 null로 연결을 풀 수 있다.
export class UpdateQuoteDto extends PartialType(
  OmitType(CreateQuoteDto, ['myBookId'] as const),
) {}
