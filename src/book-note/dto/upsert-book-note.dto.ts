import { ApiProperty } from '@nestjs/swagger';
import { BookNoteTemplate } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  BOOK_NOTE_SECTION_KEY_ENUM_NAME,
  BOOK_NOTE_SECTION_KEYS,
} from '../book-note.templates';

export class BookNoteSectionInputDto {
  // 검증은 enum이 아니라 partitionBookNoteSections가 template 기준으로 한다.
  @ApiProperty({
    description:
      '섹션 key. 고른 템플릿에 속한 key만 받는다(GET /book-note/templates 참고)',
    enum: BOOK_NOTE_SECTION_KEYS,
    enumName: BOOK_NOTE_SECTION_KEY_ENUM_NAME,
    example: 'seen',
  })
  @IsString()
  @MaxLength(30)
  key: string;

  @ApiProperty({
    description:
      '섹션 내용. 공백만 보내면 그 섹션을 비운다. 길이 제한은 섹션마다 다르다(템플릿의 maxLength).',
    example: '남의 기대가 아니라 내 과제에 집중하라는 이야기',
  })
  @IsString()
  content: string;
}

export class UpsertBookNoteDto {
  @ApiProperty({ description: '기록법 템플릿', enum: BookNoteTemplate })
  @IsEnum(BookNoteTemplate, { message: '유효한 템플릿이 아닙니다.' })
  template: BookNoteTemplate;

  @ApiProperty({
    description:
      '저장할 섹션. 보낸 섹션만 바뀌고 보내지 않은 섹션은 그대로다(부분 저장). 템플릿을 바꾸면 기존 섹션은 모두 지워진다.',
    type: [BookNoteSectionInputDto],
  })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BookNoteSectionInputDto)
  sections: BookNoteSectionInputDto[];
}
