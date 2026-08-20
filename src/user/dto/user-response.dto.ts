import { ApiProperty } from '@nestjs/swagger';
import { Gender, Provider } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ description: '유저 ID', example: 1 })
  id: number;

  @ApiProperty({
    description: '이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({ description: '닉네임', nullable: true, example: '홍길동' })
  name: string | null;

  @ApiProperty({ description: '생년월일', nullable: true, type: Date })
  birthday: Date | null;

  @ApiProperty({ description: '성별', enum: Gender, nullable: true })
  gender: Gender | null;

  @ApiProperty({ description: '가입 경로', enum: Provider })
  provider: Provider;

  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  profile: string | null;
}
