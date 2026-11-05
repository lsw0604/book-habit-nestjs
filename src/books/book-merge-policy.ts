import type { BookLookupResDto } from './dto/book-lookup-res.dto';
import type { BookMetadataPatch, BookSource } from './providers';

/**
 * Book 행을 만들 수 있는 출처. 앞이 우선이고, 첫 출처가 없을 때만 다음 출처로 만든다
 * (사용 규칙은 BookLookupService.assertBaseFound).
 *
 * 카카오 하나뿐인 이유: 도서 검색(GET /books)도 카카오라서, 검색 결과에 isbn이 있는 책은
 * 반드시 여기서도 찾아진다(= 반드시 서재에 등록할 수 있다). 서재 등록은 검색 결과로만
 * 하므로 대체 출처가 필요 없다. 바코드·ISBN 직접 입력을 들이면 대체 출처를 다시 검토한다.
 * YES24는 넣지 않는다 - YES24에서 저장을 허락받은 범위는 쪽수와 상품 링크뿐이다.
 */
export const BOOK_BASE_SOURCES = [
  'kakao',
] as const satisfies readonly BookSource[];

/**
 * 필드마다 값을 가져올 출처의 우선순위. 지금은 필드마다 출처가 하나다. 출처가 둘 이상인
 * 필드는 앞 출처에 값이 없으면(키 없음·null·빈 배열) 다음 출처로 넘어간다.
 * Book 필드가 늘면 여기에 없을 때 tsc가 실패한다(satisfies Record).
 */
export const BOOK_MERGE_POLICY = {
  // 제목·저자·출판 정보·표지는 카카오만 쓴다. 검색과 같은 출처라 "어느 책인가"가 섞이지 않는다.
  title: ['kakao'],
  authors: ['kakao'],
  translators: ['kakao'],
  publisher: ['kakao'],
  pubDate: ['kakao'],
  thumbnail: ['kakao'],
  coverImage: ['kakao'],
  // 카카오는 쪽수를 주지 않는다. YES24는 2026-11-05에 확인한 102권 중 99권에 값이 있었다.
  // YES24에 없거나 YES24가 실패하면 null이고, 사용자가 MyBook.totalPage로 직접 입력한다.
  totalPage: ['yes24'],
  // YES24 상품 링크만 담는다. 약관상 YES24 데이터(totalPage)를 보여주는 화면의 출처
  // 표기 링크라서, 다른 출처의 링크로 대신하면 클라이언트가 출처를 구분할 수 없다.
  url: ['yes24'],
} as const satisfies Record<keyof BookMetadataPatch, readonly BookSource[]>;

export type BookMetadataPatches = Partial<
  Record<BookSource, BookMetadataPatch>
>;

/**
 * 출처별 patch를 BOOK_MERGE_POLICY대로 합친다. 필드 단위로 고르므로, 정책에 없는 출처의
 * 값은 무시한다(예: YES24 patch에 제목이 있어도 쓰지 않는다).
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
