import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMyBookReviewDto {
  @ApiProperty({ description: '연결할 MyBook ID', example: 1 })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  myBookId: number;

  @ApiProperty({
    description: '한줄평 (1~150자)',
    example: '올해 읽은 책 중 최고였다.',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty({ message: '한줄평은 필수 입력값입니다.' })
  @MinLength(1, { message: '한줄평은 1자 이상이어야 합니다.' })
  @MaxLength(150, { message: '한줄평은 150자를 초과할 수 없습니다.' })
  review: string;

  @ApiProperty({ description: '공개 여부', example: true })
  @IsBoolean()
  isPublic: boolean;
}
