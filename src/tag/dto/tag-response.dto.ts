import { ApiProperty } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty({ description: 'Tag ID', example: 1 })
  id: number;

  @ApiProperty({ description: '태그 값', example: '자기계발' })
  value: string;
}
