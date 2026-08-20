import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../user/dto/user-response.dto';

export class AuthUserResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
