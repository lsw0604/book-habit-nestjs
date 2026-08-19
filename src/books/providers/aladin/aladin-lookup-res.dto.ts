import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import dayjs from 'dayjs';
import type { AladinDocumentRaw } from './aladin.types';

export class AladinLookupResDto {
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

  @ApiProperty({ description: '썸네일 이미지 (200px)', nullable: true })
  @Expose()
  thumbnail: string | null;

  @ApiProperty({ description: '커버 이미지 (500px)', nullable: true })
  @Expose()
  coverImage: string | null;

  @ApiProperty({ description: '부제', nullable: true })
  @Expose()
  subTitle: string | null;

  @ApiProperty({ description: '총 페이지 수', nullable: true })
  @Expose()
  totalPage: number | null;

  @ApiProperty({ description: '알라딘 상세 URL', nullable: true })
  @Expose()
  url: string | null;

  @ApiProperty({ description: '재고 상태', nullable: true })
  @Expose()
  stockStatus: string | null;

  // 🏭 Factory Method: Raw Data -> DTO 변환
  static from(doc: AladinDocumentRaw): AladinLookupResDto {
    const {
      title,
      author,
      cover,
      description,
      isbn13,
      link,
      pubDate: rawDate,
      subInfo,
      stockStatus,
      publisher,
    } = doc;

    const authors: string[] = [];
    const translators: string[] = [];

    if (author) {
      // 번역자 역할을 나타내는 키워드 목록
      const translatorKeywords = ['옮긴이', '역자', '번역', '편역'];
      const authorParts = author.split(',').map((s) => s.trim());

      authorParts.forEach((part) => {
        // part 문자열에 번역자 키워드가 포함되어 있는지 확인
        const isTranslator = translatorKeywords.some((keyword) =>
          part.includes(`(${keyword})`),
        );

        if (isTranslator) {
          // 번역자 키워드를 포함한 괄호를 제거하고 이름만 추출
          const translatorName = part.replace(/\s*\([^)]+\)/, '').trim();
          if (translatorName) translators.push(translatorName);
        } else {
          // 번역자가 아닌 경우, 저자로 간주하고 괄호 안의 역할 설명을 제거
          const authorName = part.replace(/\s*\([^)]+\)/, '').trim();
          if (authorName) authors.push(authorName);
        }
      });
    }

    // 안전장치: subInfo가 없을 경우 대비
    const { itemPage, subTitle } = subInfo || {};

    const pubDate = dayjs(rawDate).isValid() ? dayjs(rawDate).toDate() : null;
    const pattern = /\/(cover|cover200|cover500|sum)\//;

    return {
      isbn: isbn13,
      title,
      authors,
      translators,
      publisher: publisher || null,
      pubDate,
      description: description || null,
      // URL 치환 로직 (오타 수정됨: /cover/299 -> /cover200/)
      thumbnail: cover ? cover.replace(pattern, '/cover200/') : null,
      coverImage: cover ? cover.replace(pattern, '/cover500/') : null,
      subTitle: subTitle || null,
      totalPage: itemPage || null,
      url: link || null,
      stockStatus: stockStatus || null,
    };
  }
}
