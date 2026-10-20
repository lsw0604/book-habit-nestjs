import {
  parseUtcDate,
  splitAuthorsByRole,
  splitTitle,
} from '../book-metadata.util';
import type { BookMetadataPatch } from '../book-metadata-provider';
import type { NlDocumentRaw } from './nl.types';

/**
 * 국립중앙도서관 doc → Book 필드 patch. NL은 출처 링크(url)를 주지 않으므로 키를 두지 않는다.
 * 어떤 필드를 실제로 쓰는지는 BOOK_MERGE_POLICY가 정한다(카카오가 있으면 대부분 보충용).
 */
export class NlLookupResDto {
  static from(doc: NlDocumentRaw): BookMetadataPatch {
    const { authors, translators } = splitAuthorsByRole(doc.AUTHOR);
    const { title, subTitle } = splitTitle(doc.TITLE);
    const cover = doc.TITLE_URL?.trim() || null;

    return {
      title,
      authors,
      translators,
      publisher: doc.PUBLISHER?.trim() || null,
      // PUBLISH_PREDATE는 CIP 신청 때의 '예정일'이라, 실제 발행일이 있으면 그쪽을 쓴다.
      pubDate:
        parseUtcDate(doc.REAL_PUBLISH_DATE) ??
        parseUtcDate(doc.PUBLISH_PREDATE),
      // 국립중앙도서관은 표지를 한 가지 크기로만 주고, 실제로는 대부분 비어 있다.
      thumbnail: cover,
      coverImage: cover,
      subTitle,
      totalPage: NlLookupResDto.parsePage(doc.PAGE),
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
