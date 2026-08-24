import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateMyBookTagDto {
  @ApiProperty({ description: '연결할 MyBook ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  myBookId: number;

  @ApiProperty({ description: '태그 값', example: '자기계발', maxLength: 30 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  tagValue: string;
}
