import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { normalizeIsbn13 } from '../../common';

// 서재 등록(CreateMyBookDto)/서재 조회(MyBookIsbnParamDto)와 같은 정규화 규칙을 쓴다.
// 상세 조회는 Book을 저장하기도 하므로, 규칙이 갈라지면 같은 책이 다른 키로 저장된다.
export class BookIsbnParamDto {
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
