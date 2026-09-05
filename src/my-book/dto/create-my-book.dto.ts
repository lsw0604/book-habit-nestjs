import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MyBookStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { normalizeIsbn13 } from '../../common';

export class CreateMyBookDto {
  @ApiProperty({
    description: 'ISBN (ISBN-10/13, 하이픈 허용 - ISBN-13으로 정규화됨)',
    example: '9788996991342',
  })
  @Transform(({ value }) => normalizeIsbn13(value))
  @IsString({
    message: '유효한 ISBN이 아닙니다. (ISBN-10 또는 ISBN-13)',
  })
  isbn: string;

  @ApiPropertyOptional({
    description: '등록 시 상태 (미지정 시 WANT_TO_READ)',
    enum: MyBookStatus,
    default: MyBookStatus.WANT_TO_READ,
  })
  @IsOptional()
  @IsEnum(MyBookStatus, { message: '유효한 상태 값이 아닙니다.' })
  status?: MyBookStatus;
}
