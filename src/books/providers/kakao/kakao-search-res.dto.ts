import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { KakaoDocument } from './kakao.types';

export class KakaoBookItemDto {
  @ApiProperty({ description: 'ISBN' })
  @Expose()
  isbn: string;

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

  @ApiProperty({ description: '도서 소개', nullable: true })
  @Expose()
  description: string | null;

  @ApiProperty({ description: '출판일', nullable: true })
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
      title: raw.title,
      isbn: raw.isbn,
      authors: raw.authors,
      translators: raw.translators,
      description: raw.contents || null,
      pubDate: raw.datetime || null,
      publisher: raw.publisher || null,
      thumbnail: raw.thumbnail || null,
      status: raw.status || null,
    };
  }
}
