import type { BookLookupResDto } from '../dto/book-lookup-res.dto';

export type BookSource = 'kakao' | 'nl' | 'yes24';

/**
 * provider 하나가 주는 Book 필드의 부분집합. 어떤 필드를 어느 출처에서 가져올지는
 * BOOK_MERGE_POLICY(book-merge-policy.ts)가 정한다.
 *
 * - 그 출처가 주지 않는 필드는 **키를 두지 않는다**(예: Kakao의 부제·쪽수).
 * - null은 "그 출처에 값이 없다"는 뜻이다. 병합에서는 둘 다 다음 출처로 넘어간다.
 * - isbn은 담지 않는다. 병합 결과의 isbn은 호출 인자(정규화된 ISBN-13)를 쓴다.
 */
export type BookMetadataPatch = Partial<Omit<BookLookupResDto, 'isbn'>>;

export interface BookMetadataProvider {
  readonly source: BookSource;
  /** 못 찾으면 NotFoundException, 장애면 BadGatewayException을 던진다. */
  getByIsbn(isbn: string): Promise<BookMetadataPatch>;
}
