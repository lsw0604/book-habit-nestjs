import type { BookMetadataPatch } from '../book-metadata-provider';
import type { Yes24ItemRaw } from './yes24.types';

/**
 * YES24에서 가져오는 보충 정보. Book 전체를 만들지 않고 페이지 수와 출처 링크만 담는다.
 *
 * YES24 Open API 약관(제6조)은 일시적 캐싱만 허용하고, 데이터를 체계적으로 모아
 * 별도 DB를 만드는 것은 금지한다. Book은 한 번 저장되면 갱신되지 않으므로, 영구히
 * 남는 값은 최소한(사실 정보인 페이지 수 + 출처 표시에 필요한 링크)으로 한정한다.
 * 여기서 다른 필드를 내보내도 BOOK_MERGE_POLICY에 YES24가 없는 필드는 쓰이지 않는다.
 */
export class Yes24LookupResDto {
  static from(item: Yes24ItemRaw): BookMetadataPatch {
    return {
      // "모름"은 null로만 표현한다(0이 섞이면 페이지 상한 검사가 모든 갱신을 막는다).
      totalPage: item.pages && item.pages > 0 ? item.pages : null,
      url: item.link?.trim() || null,
    };
  }
}
