import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MyBookStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateMyBookDto {
  @ApiProperty({
    description: 'ISBN (숫자 13자리, 하이픈 등 숫자가 아닌 문자는 자동 제거됨)',
    example: '9788996991342',
  })
  @IsString()
  @IsNotEmpty({ message: 'ISBN은 필수 입력값입니다.' })
  @Transform(({ value }) => String(value).replace(/[^0-9]/g, ''))
  @Matches(/^\d{13}$/, { message: 'ISBN은 숫자 13자리여야 합니다.' })
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
