import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { parseUtcDate } from '../book-metadata.util';
import {
  BOOK_IDENTIFIER_TYPES,
  type BookIdentifierType,
  parseKakaoIdentifier,
} from './kakao-identifier.util';
import { KakaoDocument } from './kakao.types';

export class KakaoBookItemDto {
  @ApiProperty({
    description:
      '정규화된 ISBN-13. 서재 등록과 도서 상세(/search/:isbn)에 쓴다. ISBN 도서가 아니면 null',
    type: String,
    nullable: true,
    example: '9788996991342',
  })
  @Expose()
  isbn: string | null;

  @ApiProperty({
    description: '식별자 종류 (ISSN: 잡지 등 정기간행물, UNKNOWN: 판별 불가)',
    enum: BOOK_IDENTIFIER_TYPES,
    example: 'ISBN',
  })
  @Expose()
  identifierType: BookIdentifierType;

  @ApiProperty({ description: '책 제목', example: '미움받을 용기' })
  @Expose()
  title: string;

  @ApiProperty({
    description: '저자 리스트',
    example: ['기시미 이치로', '고가 후미타케'],
    type: [String],
  })
  @Expose()
  authors: string[];

  @ApiProperty({
    description: '번역자 리스트',
    example: ['전경아'],
    type: [String],
  })
  @Expose()
  translators: string[];

  @ApiProperty({
    description: '도서 소개 (카카오가 잘라서 줌)',
    nullable: true,
  })
  @Expose()
  description: string | null;

  @ApiProperty({
    description: '출판일 (YYYY-MM-DD)',
    type: String,
    nullable: true,
    example: '2014-11-17',
  })
  @Expose()
  pubDate: string | null;

  @ApiProperty({ description: '출판사', nullable: true })
  @Expose()
  publisher: string | null;

  @ApiProperty({ description: '썸네일 URL', nullable: true })
  @Expose()
  thumbnail: string | null;

  @ApiProperty({ description: '판매 상태', nullable: true })
  @Expose()
  status: string | null;

  static from(raw: KakaoDocument): KakaoBookItemDto {
    return {
      ...parseKakaoIdentifier(raw.isbn),
      title: raw.title,
      authors: raw.authors,
      translators: raw.translators,
      description: raw.contents || null,
      pubDate: KakaoBookItemDto.toDateOnly(raw.datetime),
      publisher: raw.publisher || null,
      thumbnail: raw.thumbnail || null,
      status: raw.status || null,
    };
  }

  // datetime은 "2014-11-17T00:00:00.000+09:00"(KST 자정)으로 온다. 그대로 보내면
  // 클라이언트가 new Date()로 바꿀 때 KST가 아닌 환경에서 하루 전 날짜가 되므로
  // 날짜 부분만 잘라 보낸다. 앞 10자리가 KST 기준 날짜라 시간대 변환 없이 자르면 된다.
  private static toDateOnly(datetime: string | undefined): string | null {
    const date = datetime?.slice(0, 10) ?? '';
    return parseUtcDate(date) ? date : null;
  }
}
