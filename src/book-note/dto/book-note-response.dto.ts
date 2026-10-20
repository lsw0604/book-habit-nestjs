import { ApiProperty } from '@nestjs/swagger';
import { BookNoteTemplate } from '@prisma/client';

export class BookNoteSectionResponseDto {
  @ApiProperty({ description: '섹션 key', example: 'seen' })
  key: string;

  @ApiProperty({ description: '섹션 이름', example: '본 것' })
  label: string;

  @ApiProperty({ description: '섹션 내용. 아직 쓰지 않았으면 빈 문자열' })
  content: string;

  @ApiProperty({
    description: '이 섹션을 마지막으로 쓴 시각. 아직 쓰지 않았으면 null',
    type: Date,
    nullable: true,
  })
  updatedAt: Date | null;
}

export class BookNoteResponseDto {
  @ApiProperty({ description: 'MyBook ID', example: 1 })
  myBookId: number;

  @ApiProperty({ description: '기록법 템플릿', enum: BookNoteTemplate })
  template: BookNoteTemplate;

  @ApiProperty({
    description:
      '템플릿 정의 순서대로 모든 섹션. 쓰지 않은 섹션도 content 빈 문자열로 들어 있다.',
    type: [BookNoteSectionResponseDto],
  })
  sections: BookNoteSectionResponseDto[];

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각', type: Date })
  updatedAt: Date;
}

export class BookNoteTemplateSectionDto {
  @ApiProperty({ description: '섹션 key', example: 'seen' })
  key: string;

  @ApiProperty({ description: '섹션 이름', example: '본 것' })
  label: string;

  @ApiProperty({
    description: '입력란 위에 보여줄 안내 질문',
    example: '책에서 중요하게 본 내용은 무엇인가요?',
  })
  prompt: string;

  @ApiProperty({ description: '입력란 placeholder' })
  placeholder: string;

  @ApiProperty({ description: '최대 글자 수', example: 1000 })
  maxLength: number;
}

export class BookNoteTemplateResponseDto {
  @ApiProperty({ description: '템플릿 key', enum: BookNoteTemplate })
  template: BookNoteTemplate;

  @ApiProperty({ description: '템플릿 이름', example: '본깨적' })
  name: string;

  @ApiProperty({ description: '템플릿 설명' })
  description: string;

  @ApiProperty({ description: '처음 기록하는 사람에게 권하는 템플릿인지' })
  recommended: boolean;

  @ApiProperty({ type: [BookNoteTemplateSectionDto] })
  sections: BookNoteTemplateSectionDto[];
}
