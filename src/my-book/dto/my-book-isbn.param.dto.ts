import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { normalizeIsbn13 } from '../../common';

// CreateMyBookDto와 같은 정규화 규칙을 쓴다. 규칙이 갈라지면
// "조회는 없다는데 등록하면 이미 있다(409)"는 모순이 생긴다.
export class MyBookIsbnParamDto {
  @ApiProperty({
    description: 'ISBN (ISBN-10/13, 하이픈 허용 - ISBN-13으로 정규화됨)',
    example: '9788996991342',
  })
  @Transform(({ value }) => normalizeIsbn13(value))
  @IsString({
    message: '유효한 ISBN이 아닙니다. (ISBN-10 또는 ISBN-13)',
  })
  isbn: string;
}
