import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { ApiErrorResponse, ApiResponseDto } from '../common';

class HealthIndicatorDto {
  @ApiProperty({ description: '인디케이터 상태', example: 'up' })
  status: string;
}

class HealthCheckResultDto {
  @ApiProperty({ description: '전체 상태', example: 'ok' })
  status: string;

  @ApiProperty({
    description: '정상인 인디케이터',
    example: { database: { status: 'up' } },
    additionalProperties: { type: 'object' },
  })
  info: Record<string, HealthIndicatorDto>;

  @ApiProperty({
    description: '실패한 인디케이터',
    example: {},
    additionalProperties: { type: 'object' },
  })
  error: Record<string, HealthIndicatorDto>;

  @ApiProperty({
    description: 'info와 error를 합친 전체 결과',
    example: { database: { status: 'up' } },
    additionalProperties: { type: 'object' },
  })
  details: Record<string, HealthIndicatorDto>;
}

@ApiTags('Health')
@ApiExtraModels(HealthIndicatorDto)
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  // @HealthCheck()은 terminus의 원본 모양을 200/503으로 문서화하는데, 전역
  // ResponseDtoInterceptor가 성공 응답을 봉투로 감싸고 ResponseExceptionFilter가
  // 503을 { success:false, statusCode, message }로 정규화하므로 두 응답 다
  // 문서와 달라진다. 아래 두 데코레이터가 @HealthCheck()의 선언을 덮어써서
  // 실제로 나가는 모양으로 되돌린다(데코레이터는 아래에서 위로 적용되므로
  // @HealthCheck()보다 위에 와야 한다).
  @ApiResponseDto(HealthCheckResultDto)
  @ApiErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, 'DB 핑 실패')
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: '헬스체크 (DB 커넥션 확인)',
    description:
      '인프라 프로브 전용이라 가드가 없다. FE에서 호출하지 않는다. 응답은 다른 엔드포인트와 같은 봉투에 싸여 나간다.',
  })
  check() {
    return this.health.check([
      () =>
        this.prismaHealthIndicator.pingCheck('database', this.prismaService),
    ]);
  }
}
