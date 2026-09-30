import { ApiProperty } from '@nestjs/swagger';
import type { Book } from '@prisma/client';
import type { BookLookupResDto } from './book-lookup-res.dto';

/**
 * GET /books/detail/:isbn 응답. DB의 Book 행(서재에 담긴 책) 또는 외부 조회 결과(아직
 * 아무도 담지 않은 책)에서 만든다. 내부 값(id/createdAt/updatedAt)은 내보내지 않는다 -
 * Book.id는 어떤 엔드포인트로도 노출하지 않는다(상세 페이지는 ISBN 기준).
 *
 * 저장용 형태(BookLookupResDto)와 일부러 분리했다. 저장용은 Book 필드와 정확히 같아야
 * 하지만, 응답은 화면에 필요한 만큼만 보내도 되므로 둘은 따로 바뀔 수 있다.
 */
export class BookDetailResDto {
  @ApiProperty({ description: 'ISBN13', example: '9788996991342' })
  isbn: string;

  @ApiProperty({ description: '책 제목', example: '미움받을 용기' })
  title: string;

  @ApiProperty({ description: '부제', type: String, nullable: true })
  subTitle: string | null;

  @ApiProperty({
    description: '저자 목록',
    example: ['기시미 이치로', '고가 후미타케'],
    type: [String],
  })
  authors: string[];

  @ApiProperty({
    description: '번역자 목록',
    example: ['전경아'],
    type: [String],
  })
  translators: string[];

  @ApiProperty({ description: '출판사', type: String, nullable: true })
  publisher: string | null;

  @ApiProperty({ description: '출판일', type: Date, nullable: true })
  pubDate: Date | null;

  @ApiProperty({ description: '책 소개', type: String, nullable: true })
  description: string | null;

  @ApiProperty({ description: '썸네일 이미지', type: String, nullable: true })
  thumbnail: string | null;

  @ApiProperty({ description: '커버 이미지', type: String, nullable: true })
  coverImage: string | null;

  @ApiProperty({ description: '상세 URL', type: String, nullable: true })
  url: string | null;

  @ApiProperty({ description: '총 페이지 수', type: Number, nullable: true })
  totalPage: number | null;

  static from(book: Book | BookLookupResDto): BookDetailResDto {
    return {
      isbn: book.isbn,
      title: book.title,
      subTitle: book.subTitle,
      authors: toStringArray(book.authors),
      translators: toStringArray(book.translators),
      publisher: book.publisher,
      pubDate: book.pubDate,
      description: book.description,
      thumbnail: book.thumbnail,
      coverImage: book.coverImage,
      url: book.url,
      totalPage: book.totalPage,
    };
  }
}

// DB의 authors/translators는 Json 컬럼이라 Prisma 타입이 JsonValue다. 저장은 항상
// string[]로 하지만, 타입상 보장이 없으므로 배열이 아니거나 문자열이 아닌 값은 걸러낸다.
function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
