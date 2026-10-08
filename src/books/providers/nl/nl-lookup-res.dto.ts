import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  parseUtcDate,
  splitAuthorsByRole,
  splitTitle,
} from '../book-metadata.util';
import type { NlDocumentRaw } from './nl.types';

export class NlLookupResDto {
  @ApiProperty({ description: 'ISBN13', example: '9788996991342' })
  @Expose()
  isbn: string;

  @ApiProperty({ description: '책 제목', example: '미움받을 용기' })
  @Expose()
  title: string;

  @ApiProperty({
    description: '저자 목록',
    example: ['기시미 이치로', '고가 후미타케'],
    type: [String],
  })
  @Expose()
  authors: string[];

  @ApiProperty({
    description: '번역자 목록',
    example: ['전경아'],
    type: [String],
  })
  @Expose()
  translators: string[];

  @ApiProperty({
    description: '출판사',
    nullable: true,
    type: String,
    example: '인플루엔셜',
  })
  @Expose()
  publisher: string | null;

  @ApiProperty({ description: '출판일', nullable: true, type: Date })
  @Expose()
  pubDate: Date | null;

  @ApiProperty({ description: '책 설명', nullable: true, type: String })
  @Expose()
  description: string | null;

  @ApiProperty({ description: '썸네일 이미지', nullable: true, type: String })
  @Expose()
  thumbnail: string | null;

  @ApiProperty({ description: '커버 이미지', nullable: true, type: String })
  @Expose()
  coverImage: string | null;

  @ApiProperty({ description: '부제', nullable: true, type: String })
  @Expose()
  subTitle: string | null;

  @ApiProperty({ description: '총 페이지 수', nullable: true, type: Number })
  @Expose()
  totalPage: number | null;

  @ApiProperty({
    description: '상세 URL (국립중앙도서관 API 미제공)',
    nullable: true,
    type: String,
  })
  @Expose()
  url: string | null;

  static from(doc: NlDocumentRaw): NlLookupResDto {
    const { authors, translators } = splitAuthorsByRole(doc.AUTHOR);
    const { title, subTitle } = splitTitle(doc.TITLE);
    const cover = doc.TITLE_URL?.trim() || null;

    return {
      isbn: doc.EA_ISBN,
      title,
      authors,
      translators,
      publisher: doc.PUBLISHER?.trim() || null,
      // PUBLISH_PREDATE는 CIP 신청 때의 '예정일'이라, 실제 발행일이 있으면 그쪽을 쓴다.
      pubDate:
        parseUtcDate(doc.REAL_PUBLISH_DATE) ??
        parseUtcDate(doc.PUBLISH_PREDATE),
      description: doc.BOOK_INTRODUCTION?.replace(/\r\n/g, '\n').trim() || null,
      // 국립중앙도서관은 표지를 한 가지 크기로만 주고, 실제로는 대부분 비어 있다.
      thumbnail: cover,
      coverImage: cover,
      subTitle,
      totalPage: NlLookupResDto.parsePage(doc.PAGE),
      url: null,
    };
  }

  // PAGE는 '336', '336 p.', 'xii, 336 p.', '336쪽' 등 형식이 제각각이고 비어 있는 경우도 많다.
  private static parsePage(raw: string | undefined): number | null {
    const text = raw?.trim() ?? '';
    const match = text.match(/(\d+)\s*(?:p|쪽)/i) ?? text.match(/^(\d+)$/);
    const page = match ? Number(match[1]) : 0;
    return page > 0 ? page : null;
  }
}
