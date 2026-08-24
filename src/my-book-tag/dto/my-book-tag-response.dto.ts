import { ApiProperty } from '@nestjs/swagger';
import { TagResponseDto } from '../../tag/dto/tag-response.dto';

export class MyBookTagResponseDto {
  @ApiProperty({ description: 'MyBookTag ID', example: 1 })
  id: number;

  @ApiProperty({ description: '연결된 MyBook ID', example: 1 })
  myBookId: number;

  @ApiProperty({ description: '태그', type: TagResponseDto })
  tag: TagResponseDto;

  @ApiProperty({ description: '생성 시각', type: Date })
  createdAt: Date;
}
