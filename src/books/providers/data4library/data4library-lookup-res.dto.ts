import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  parseUtcDate,
  splitAuthorsByRole,
  splitTitle,
} from '../book-metadata.util';
import type { Data4LibraryBookRaw } from './data4library.types';

export class Data4LibraryLookupResDto {
  @ApiProperty({ description: 'ISBN13', example: '9788996991342' })
  @Expose()
  isbn: string;

  @ApiProperty({ description: '책 제목', example: '미움받을 용기' })
  @Expose()
  title: string;

  @ApiProperty({
    description: '저자 목록',
    example: ['기시미 이치로', '고가 후미타케'],
  })
  @Expose()
  authors: string[];

  @ApiProperty({ description: '번역자 목록', example: ['전경아'] })
  @Expose()
  translators: string[];

  @ApiProperty({ description: '출판사', nullable: true, example: '인플루엔셜' })
  @Expose()
  publisher: string | null;

  @ApiProperty({ description: '출판일', nullable: true, type: Date })
  @Expose()
  pubDate: Date | null;

  @ApiProperty({ description: '책 설명', nullable: true })
  @Expose()
  description: string | null;

  @ApiProperty({ description: '썸네일 이미지', nullable: true })
  @Expose()
  thumbnail: string | null;

  @ApiProperty({ description: '커버 이미지', nullable: true })
  @Expose()
  coverImage: string | null;

  @ApiProperty({ description: '부제', nullable: true })
  @Expose()
  subTitle: string | null;

  @ApiProperty({
    description: '총 페이지 수 (정보나루 API 미제공)',
    nullable: true,
  })
  @Expose()
  totalPage: number | null;

  @ApiProperty({
    description: '상세 URL (정보나루 API 미제공)',
    nullable: true,
  })
  @Expose()
  url: string | null;

  static from(book: Data4LibraryBookRaw): Data4LibraryLookupResDto {
    const { authors, translators } = splitAuthorsByRole(book.authors);
    const { title, subTitle } = splitTitle(book.bookname);
    const cover = book.bookImageURL?.trim() || null;

    return {
      isbn: book.isbn13,
      title,
      authors,
      translators,
      publisher: book.publisher?.trim() || null,
      // publication_date도 실제로는 '2014'처럼 연도만 오는 경우가 많고, 그러면 null이다.
      pubDate: parseUtcDate(book.publication_date),
      description: book.description?.trim() || null,
      // 정보나루는 표지를 한 가지 크기로만 제공한다.
      thumbnail: cover,
      coverImage: cover,
      subTitle,
      totalPage: null,
      url: null,
    };
  }
}
