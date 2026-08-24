import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';

export class UpdateQuoteDto extends PartialType(
  OmitType(CreateQuoteDto, ['readingLogId'] as const),
) {}
