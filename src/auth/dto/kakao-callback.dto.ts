import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KakaoCallbackDto {
  @ApiProperty({
    description: '카카오 인가 서버로부터 받은 authorization code',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'code는 필수 입력값입니다.' })
  code: string;
}
