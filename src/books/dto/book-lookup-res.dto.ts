/**
 * ISBN으로 외부에서 조회한 책 정보 - Book 저장용 내부 타입이다(API 응답으로 쓰지 않는다).
 *
 * Book 모델 필드와 정확히 같아야 한다. BooksService.findOrCreate가 이 값을 그대로
 * prisma.book.create에 넘기므로, 필드가 하나라도 남으면 런타임에 Prisma가 거부한다
 * (타입 체크로는 안 잡힌다). API 응답은 BookDetailResDto를 쓴다.
 */
export class BookLookupResDto {
  isbn: string;
  title: string;
  subTitle: string | null;
  authors: string[];
  translators: string[];
  publisher: string | null;
  pubDate: Date | null;
  description: string | null;
  thumbnail: string | null;
  coverImage: string | null;
  url: string | null;
  totalPage: number | null;
}
