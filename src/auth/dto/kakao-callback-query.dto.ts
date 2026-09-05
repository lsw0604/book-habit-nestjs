import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// 카카오가 콜백으로 붙여 보내는 쿼리. 전역 ValidationPipe는 forbidNonWhitelisted라
// 여기 선언되지 않은 키가 하나라도 오면 400 JSON으로 떨어져 리다이렉트 처리 자체를
// 건너뛰므로, 카카오가 보낼 수 있는 키(code/state/error/error_description)를 모두
// 선언해 둔다. 또 성공(code)과 거부(error)가 배타적이라 전부 optional로 두고,
// 실제 조합 검증은 state 대조와 함께 컨트롤러가 담당한다.
export class KakaoCallbackQueryDto {
  @ApiPropertyOptional({ description: '카카오 인가 코드' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'CSRF 방지용 state (쿠키 값과 대조)' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: '사용자가 동의를 거부한 경우의 에러 코드',
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: '에러 상세 설명' })
  @IsOptional()
  @IsString()
  error_description?: string;
}
