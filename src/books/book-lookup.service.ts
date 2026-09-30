import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookLookupResDto } from './dto/book-lookup-res.dto';
import { KakaoBookSearchService, NlBookSearchService } from './providers';

/**
 * ISBN 한 권의 책 정보를 카카오(기본) + 국립중앙도서관(보충)으로 만든다.
 * 알라딘 API 종료(2026-10-30)에 대비한 대체 경로 - 아직 BooksModule에 연결하지 않았다.
 *
 * 카카오를 기본으로 쓰는 이유: 도서 검색(GET /books)도 카카오라서, 검색 결과에 isbn이
 * 있는 책은 반드시 여기서도 찾아진다(= 반드시 서재에 등록할 수 있다). 표지와 저자/번역자
 * 배열도 카카오가 가장 온전하다.
 *
 * NL은 카카오에 없는 것만 채운다: 페이지 수, 잘리지 않은 책 소개, 부제.
 * 표지는 NL에 사실상 없어서(TITLE_URL이 확인한 전부 비어 있음) 카카오만 쓴다.
 */
@Injectable()
export class BookLookupService {
  private readonly logger = new Logger(BookLookupService.name);

  constructor(
    private readonly kakaoBookSearchService: KakaoBookSearchService,
    private readonly nlBookSearchService: NlBookSearchService,
  ) {}

  public async getByIsbn(isbn: string): Promise<BookLookupResDto> {
    // 서로 독립적인 조회라 동시에 보낸다(순차로 보내면 서재 등록이 두 API 응답 시간의 합만큼 느려진다).
    const [kakao, nl] = await Promise.allSettled([
      this.kakaoBookSearchService.getByIsbn(isbn),
      this.nlBookSearchService.getByIsbn(isbn),
    ]);

    if (nl.status === 'rejected' && !(nl.reason instanceof NotFoundException)) {
      // NL은 보충용이라 실패해도 등록은 계속한다. 다만 인증키 누락/장애는 알아챌 수 있게 남긴다.
      this.logger.warn(
        `NL 보충 조회 실패(무시하고 진행): ${String(nl.reason)}`,
      );
    }
    const supplement = nl.status === 'fulfilled' ? nl.value : null;

    if (kakao.status === 'fulfilled') {
      return this.merge(kakao.value, supplement);
    }

    // 카카오 장애(502 등)는 NL로 대신하지 않고 그대로 실패시킨다. Book은 한 번 저장되면
    // 갱신되지 않아서(findOrCreate의 update: {}), 여기서 NL만으로 저장하면 표지 없는
    // 책이 영구히 남는다. 잠시 뒤 재시도하는 편이 낫다.
    if (!(kakao.reason instanceof NotFoundException)) {
      throw kakao.reason;
    }

    // 카카오에 정말 없는 책(전자책 등)만 NL 단독으로 만든다. 이때는 표지가 없다.
    if (supplement) return supplement;

    throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
  }

  private merge(
    base: BookLookupResDto,
    supplement: BookLookupResDto | null,
  ): BookLookupResDto {
    if (!supplement) return base;

    return {
      ...base,
      subTitle: base.subTitle ?? supplement.subTitle,
      totalPage: base.totalPage ?? supplement.totalPage,
      // 카카오 소개는 200자 안팎에서 잘려 있으므로, NL에 전문이 있으면 그쪽을 쓴다.
      description: supplement.description ?? base.description,
    };
  }
}
