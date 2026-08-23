import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateReadingLogDto } from './create-reading-log.dto';

export class UpdateReadingLogDto extends PartialType(
  OmitType(CreateReadingLogDto, ['myBookId'] as const),
) {}
