import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T> {
  @ApiProperty({ description: '성공 여부', example: true })
  success: boolean;

  @ApiProperty({ description: 'HTTP 상태 코드', example: 200 })
  statusCode: number;

  @ApiProperty({
    description: '응답 메시지',
    example: '성공적으로 처리되었습니다',
  })
  message: string;

  @ApiProperty({ description: '응답 데이터 Payload', required: false })
  data?: T;

  constructor(options: {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
  }) {
    this.success = options.success;
    this.statusCode = options.statusCode;
    this.message = options.message;
    this.data = options.data;
  }

  static success<T>(
    data?: T,
    message = '성공적으로 처리되었습니다',
  ): ResponseDto<T> {
    return new ResponseDto<T>({
      success: true,
      statusCode: HttpStatus.OK,
      message,
      data,
    });
  }

  static created<T>(
    data?: T,
    message = '성공적으로 생성되었습니다',
  ): ResponseDto<T> {
    return new ResponseDto<T>({
      success: true,
      statusCode: HttpStatus.CREATED,
      message,
      data,
    });
  }

  static noContent(message = '콘텐츠가 없습니다'): ResponseDto<null> {
    return new ResponseDto<null>({
      success: true,
      statusCode: HttpStatus.NO_CONTENT,
      message,
    });
  }

  static error(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  ): ResponseDto<null> {
    return new ResponseDto<null>({
      success: false,
      statusCode,
      message,
    });
  }
}
