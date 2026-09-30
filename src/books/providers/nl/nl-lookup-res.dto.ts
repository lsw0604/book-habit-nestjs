import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import type { NlDocumentRaw } from './nl.types';

// AUTHOR는 "기시미 이치로, 고가 후미타케 [공]지음 ; 전경아 옮김"처럼
// 역할별 그룹을 ';'로, 그룹 안의 인물을 ','로 구분한다.
const TRANSLATOR_PATTERN =
  /옮김|옮긴이|역자|번역|편역|공역|(?:^|\s)역(?:$|\s|:)/;
const ROLE_PREFIX_PATTERN = /^[^:]*:/;
const BRACKET_PATTERN = /\[[^\]]*\]|\([^)]*\)/g;
const TRAILING_ROLE_PATTERN =
  /\s+(?:지음|지은이|저|저자|공저|편저|글|그림|엮음|엮은이|편|옮김|옮긴이|역|역자|번역|편역|공역)$/;

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

  @ApiProperty({
    description: '부제 (국립중앙도서관 API 미제공)',
    nullable: true,
  })
  @Expose()
  subTitle: string | null;

  @ApiProperty({ description: '총 페이지 수', nullable: true })
  @Expose()
  totalPage: number | null;

  @ApiProperty({
    description: '상세 URL (국립중앙도서관 API 미제공)',
    nullable: true,
  })
  @Expose()
  url: string | null;

  @ApiProperty({
    description: '재고 상태 (국립중앙도서관 API 미제공)',
    nullable: true,
  })
  @Expose()
  stockStatus: string | null;

  static from(doc: NlDocumentRaw): NlLookupResDto {
    const { authors, translators } = NlLookupResDto.parseAuthor(doc.AUTHOR);
    const cover = doc.TITLE_URL?.trim() || null;

    return {
      isbn: doc.EA_ISBN,
      title: doc.TITLE.trim(),
      authors,
      translators,
      publisher: doc.PUBLISHER?.trim() || null,
      pubDate: NlLookupResDto.parsePubDate(doc.PUBLISH_PREDATE),
      description: doc.BOOK_INTRODUCTION?.trim() || null,
      // 국립중앙도서관은 표지를 한 가지 크기로만 제공한다.
      thumbnail: cover,
      coverImage: cover,
      subTitle: null,
      totalPage: NlLookupResDto.parsePage(doc.PAGE),
      url: null,
      stockStatus: null,
    };
  }

  private static parseAuthor(raw: string | undefined): {
    authors: string[];
    translators: string[];
  } {
    const authors: string[] = [];
    const translators: string[] = [];
    if (!raw) return { authors, translators };

    raw.split(';').forEach((group) => {
      const isTranslator = TRANSLATOR_PATTERN.test(group);
      const names = group
        .replace(ROLE_PREFIX_PATTERN, '')
        .replace(BRACKET_PATTERN, '')
        .trim()
        .replace(TRAILING_ROLE_PATTERN, '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

      (isTranslator ? translators : authors).push(...names);
    });

    return { authors, translators };
  }

  // 'yyyymmdd'를 UTC 자정으로 변환한다. Book.pubDate는 @db.Date라 UTC 기준으로
  // 잘리므로, 로컬 자정으로 파싱하면 KST에서 하루 전 날짜로 저장된다.
  private static parsePubDate(raw: string | undefined): Date | null {
    const match = raw?.trim().match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!match) return null;

    const [, y, m, d] = match.map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    // '20250230'이 3월 2일로 넘어가는 것을 막는다.
    return date.getUTCMonth() === m - 1 && date.getUTCDate() === d
      ? date
      : null;
  }

  // PAGE는 '336', '336 p.', 'xii, 336 p.', '336쪽' 등 형식이 제각각이고 비어 있는 경우도 많다.
  private static parsePage(raw: string | undefined): number | null {
    const text = raw?.trim() ?? '';
    const match = text.match(/(\d+)\s*(?:p|쪽)/i) ?? text.match(/^(\d+)$/);
    const page = match ? Number(match[1]) : 0;
    return page > 0 ? page : null;
  }
}
