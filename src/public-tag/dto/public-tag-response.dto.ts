import { ApiProperty } from '@nestjs/swagger';

export class PublicTagItemDto {
  @ApiProperty({ description: 'Tag ID', example: 12 })
  tagId: number;

  @ApiProperty({ description: '태그 값', example: '자기계발' })
  value: string;

  @ApiProperty({
    description: '이 태그가 붙은 서재 항목(MyBook) 수 — 전체 사용자 합산',
    example: 1840,
  })
  count: number;
}
