import type { BookLookupResDto } from './dto/book-lookup-res.dto';
import type { BookMetadataPatch, BookSource } from './providers';

/**
 * Book 행을 만들 수 있는 출처. 앞이 우선이다(사용 규칙은 BookLookupService.assertBaseFound).
 *
 * Kakao가 먼저인 이유: 도서 검색(GET /books)도 카카오라서, 검색 결과에 isbn이 있는 책은
 * 반드시 여기서도 찾아진다(= 반드시 서재에 등록할 수 있다).
 * YES24는 넣지 않는다 - YES24 Open API 약관(제6조)은 데이터를 모아 별도 DB를 만드는 것을
 * 금지하는데, Book은 한 번 저장되면 갱신되지 않는 영구 행이다.
 */
export const BOOK_BASE_SOURCES = [
  'kakao',
  'nl',
] as const satisfies readonly BookSource[];

/**
 * 필드마다 값을 가져올 출처의 우선순위. 앞 출처에 값이 없으면(키 없음·null·빈 배열) 다음
 * 출처로 넘어간다. Book 필드가 늘면 여기에 없을 때 tsc가 실패한다(satisfies Record).
 */
export const BOOK_MERGE_POLICY = {
  // 제목·저자·표지는 카카오가 가장 온전하다. NL은 카카오에 없는 책(전자책 등)의 대체다.
  // NL의 표지(TITLE_URL)는 확인한 전부 비어 있었다.
  title: ['kakao', 'nl'],
  // 카카오는 부제를 따로 주지 않는다.
  subTitle: ['nl'],
  authors: ['kakao', 'nl'],
  translators: ['kakao', 'nl'],
  publisher: ['kakao', 'nl'],
  pubDate: ['kakao', 'nl'],
  thumbnail: ['kakao', 'nl'],
  coverImage: ['kakao', 'nl'],
  // NL PAGE는 유명한 책(미움받을 용기, 클린 코드)도 비어 있고 전자책은 '0'인데, YES24는
  // 확인한 전부에 값이 있었다(2026-10-15). 카카오는 쪽수를 주지 않는다.
  totalPage: ['yes24', 'nl'],
  // YES24 상품 링크만 담는다. 약관상 YES24 데이터(totalPage)를 보여주는 화면의 출처
  // 표기 링크라서, 다른 출처의 링크로 대신하면 클라이언트가 출처를 구분할 수 없다.
  url: ['yes24'],
} as const satisfies Record<keyof BookMetadataPatch, readonly BookSource[]>;

export type BookMetadataPatches = Partial<
  Record<BookSource, BookMetadataPatch>
>;

/**
 * 출처별 patch를 BOOK_MERGE_POLICY대로 합친다. 필드 단위로 고르므로, 카카오가 비운
 * 필드(예: 출판사)는 NL 값으로 채워질 수 있다. 제목은 카카오가 찾았으면 항상 카카오
 * 값이라 "어느 책인가"는 섞이지 않는다.
 *
 * 기본 출처가 있는지는 호출자가 먼저 확인한다. 여기서는 제목이 없으면 던진다.
 */
export function mergeBookMetadata(
  isbn: string,
  patches: BookMetadataPatches,
): BookLookupResDto {
  const pick = <K extends keyof BookMetadataPatch>(
    field: K,
  ): BookMetadataPatch[K] | undefined => {
    for (const source of BOOK_MERGE_POLICY[field]) {
      const value = patches[source]?.[field];
      if (isPresent(value)) return value;
    }
    return undefined;
  };

  const title = pick('title');
  if (!title) {
    throw new Error(
      `병합할 제목이 없습니다(isbn=${isbn}). 기본 출처를 먼저 확인해야 합니다.`,
    );
  }

  return {
    isbn,
    title,
    subTitle: pick('subTitle') ?? null,
    authors: pick('authors') ?? [],
    translators: pick('translators') ?? [],
    publisher: pick('publisher') ?? null,
    pubDate: pick('pubDate') ?? null,
    thumbnail: pick('thumbnail') ?? null,
    coverImage: pick('coverImage') ?? null,
    url: pick('url') ?? null,
    totalPage: pick('totalPage') ?? null,
  };
}

// "값 없음"은 키 없음·null·빈 문자열·빈 배열이다. 빈 배열도 다음 출처로 넘기지만,
// 모든 출처가 비어 있으면 결과는 []다(번역자가 없는 책).
function isPresent(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  return !(Array.isArray(value) && value.length === 0);
}
