import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
    required: true,
  })
  @IsEmail({}, { message: '올바른 이메일 형식이어야 합니다.' })
  email: string;

  @ApiProperty({
    description: '비밀번호 (8자 이상)',
    example: 'password1234',
    required: true,
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password: string;

  @ApiProperty({
    description: '닉네임',
    example: '홍길동',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: '닉네임은 필수 입력값입니다.' })
  name: string;

  @ApiPropertyOptional({
    description: '생년월일',
    example: '1995-05-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: '생년월일은 날짜 형식이어야 합니다.' })
  birthday?: Date;

  @ApiPropertyOptional({
    description: '성별',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender, { message: '성별은 MALE 또는 FEMALE이어야 합니다.' })
  gender?: Gender;
}
