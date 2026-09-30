import { BookLookupResDto } from '../../dto/book-lookup-res.dto';
import { parseUtcDate } from '../book-metadata.util';
import { KakaoDocument } from './kakao.types';

// 카카오 표지 원본이 있는 CDN. HTTPS로도 같은 이미지를 준다(2026-09-30 확인).
const DAUM_CDN_HOST = 't1.daumcdn.net';

export class KakaoLookupResDto extends BookLookupResDto {
  /** isbn은 호출자가 이미 판별한 ISBN-13을 넘긴다 (parseKakaoIdentifier 결과). */
  static from(doc: KakaoDocument, isbn: string): KakaoLookupResDto {
    const thumbnail = doc.thumbnail || null;

    return {
      isbn,
      title: doc.title,
      // 카카오는 부제를 따로 주지 않는다. BookLookupService가 NL에서 보충한다.
      subTitle: null,
      authors: doc.authors,
      translators: doc.translators,
      publisher: doc.publisher || null,
      // "2014-11-17T00:00:00.000+09:00"(KST 자정)을 new Date()로 바꾸면 UTC로
      // 11월 16일이 되어 @db.Date에 하루 전으로 저장된다. 날짜 부분만 쓴다.
      pubDate: parseUtcDate(doc.datetime?.slice(0, 10)),
      // 카카오는 소개를 250자 안팎에서 잘라 준다(검색 결과 미리보기라 늘리는 옵션이 없다). BookLookupService가 NL 전문으로 대체한다.
      description: doc.contents || null,
      thumbnail,
      coverImage: KakaoLookupResDto.toOriginalCover(thumbnail),
      url: doc.url?.replace(/&amp;/g, '&') || null,
      // 카카오는 페이지 수를 주지 않는다. BookLookupService가 NL에서 보충한다.
      totalPage: null,
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
