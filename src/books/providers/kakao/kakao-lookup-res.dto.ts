import type { BookMetadataPatch } from '../book-metadata-provider';
import { parseUtcDate } from '../book-metadata.util';
import { KakaoDocument } from './kakao.types';

// 카카오 표지 원본이 있는 CDN. HTTPS로도 같은 이미지를 준다(2026-09-30 확인).
const DAUM_CDN_HOST = 't1.daumcdn.net';

/**
 * 카카오 문서 → Book 필드 patch. 카카오가 주지 않는 부제·쪽수·출처 링크는 키를 두지 않는다
 * (카카오의 url은 다음 책 검색 페이지라 Book.url에 쓰지 않는다). 출처 규칙은 BOOK_MERGE_POLICY.
 */
export class KakaoLookupResDto {
  static from(doc: KakaoDocument): BookMetadataPatch {
    const thumbnail = doc.thumbnail || null;

    return {
      title: doc.title,
      authors: doc.authors,
      translators: doc.translators,
      publisher: doc.publisher || null,
      // "2014-11-17T00:00:00.000+09:00"(KST 자정)을 new Date()로 바꾸면 UTC로
      // 11월 16일이 되어 @db.Date에 하루 전으로 저장된다. 날짜 부분만 쓴다.
      pubDate: parseUtcDate(doc.datetime?.slice(0, 10)),
      thumbnail,
      coverImage: KakaoLookupResDto.toOriginalCover(thumbnail),
    };
  }

  /**
   * thumbnail은 카카오 리사이즈 URL(R120x174)이고, 원본 주소가 fname 파라미터에 들어 있다.
   * "https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F1467038%3F..."
   * → "https://t1.daumcdn.net/lbook/image/1467038?..." (약 460x680, 알라딘 cover500과 비슷)
   * 원본을 못 꺼내면 thumbnail을 그대로 쓴다.
   */
  static toOriginalCover(thumbnail: string | null): string | null {
    if (!thumbnail) return null;

    try {
      const fname = new URL(thumbnail).searchParams.get('fname');
      if (!fname) return thumbnail;

      const original = new URL(fname);
      if (original.hostname === DAUM_CDN_HOST) original.protocol = 'https:';
      return original.toString();
    } catch {
      return thumbnail;
    }
  }
}
