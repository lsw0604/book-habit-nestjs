import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookLookupResDto } from './dto/book-lookup-res.dto';
import {
  BOOK_BASE_SOURCES,
  type BookMetadataPatches,
  mergeBookMetadata,
} from './book-merge-policy';
import {
  type BookMetadataProvider,
  type BookSource,
  KakaoBookSearchService,
  NlBookSearchService,
  Yes24BookSearchService,
} from './providers';

/**
 * ISBN 한 권의 책 정보를 카카오·국립중앙도서관·YES24에서 모아 Book 모양으로 만든다.
 *
 * 어떤 필드를 어느 출처에서 가져오는지, 어느 출처가 행을 만들 수 있는지는
 * book-merge-policy.ts(BOOK_MERGE_POLICY, BOOK_BASE_SOURCES)가 정한다. 이 서비스는
 * 호출·실패 처리만 맡고 출처별 분기를 두지 않는다.
 *
 * 책 소개는 저장하지 않는다. 독서 기록 앱이라 소개를 쓰는 화면이 없고, 더 알고 싶으면
 * 출처 링크(YES24 상품 페이지)로 넘어가면 된다. 쓰는 화면이 생기면 그때 다시 들인다.
 */
@Injectable()
export class BookLookupService {
  private readonly logger = new Logger(BookLookupService.name);
  private readonly providers: readonly BookMetadataProvider[];

  constructor(
    kakaoBookSearchService: KakaoBookSearchService,
    nlBookSearchService: NlBookSearchService,
    yes24BookSearchService: Yes24BookSearchService,
  ) {
    this.providers = [
      kakaoBookSearchService,
      nlBookSearchService,
      yes24BookSearchService,
    ];
  }

  public async getByIsbn(isbn: string): Promise<BookLookupResDto> {
    // 서로 독립적인 조회라 동시에 보낸다(순차로 보내면 서재 등록이 세 API 응답 시간의 합만큼 느려진다).
    const settled = await Promise.allSettled(
      this.providers.map((provider) => provider.getByIsbn(isbn)),
    );

    const patches: BookMetadataPatches = {};
    const failures: Partial<Record<BookSource, unknown>> = {};
    this.providers.forEach(({ source }, index) => {
      const result = settled[index];
      if (result.status === 'fulfilled') patches[source] = result.value;
      else failures[source] = result.reason;
    });

    this.warnSupplementFailures(failures);
    this.assertBaseFound(patches, failures);

    return mergeBookMetadata(isbn, patches);
  }

  /**
   * BOOK_BASE_SOURCES 중 하나는 찾아야 Book을 만들 수 있다.
   *
   * 첫 번째 출처(카카오)의 장애(404 외 실패)는 다음 출처로 대신하지 않고 그대로 던진다.
   * Book은 한 번 저장되면 갱신되지 않아서(findOrCreate의 update: {}), 여기서 NL만으로
   * 저장하면 표지 없는 책이 영구히 남는다. 잠시 뒤 재시도하는 편이 낫다.
   * 카카오에 정말 없는 책(전자책 등)만 다음 출처로 만들고, 그것도 없으면 404다.
   * YES24에만 있는 책도 404다(YES24는 기본 출처가 아니다).
   */
  private assertBaseFound(
    patches: BookMetadataPatches,
    failures: Partial<Record<BookSource, unknown>>,
  ): void {
    const [primary, ...fallbacks] = BOOK_BASE_SOURCES;
    if (patches[primary]) return;

    const primaryError = failures[primary];
    if (!(primaryError instanceof NotFoundException)) throw primaryError;

    if (fallbacks.some((source) => patches[source])) return;

    throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
  }

  /** 보충 출처는 실패해도 등록을 계속한다. 다만 인증키 누락/장애는 알아챌 수 있게 남긴다. */
  private warnSupplementFailures(
    failures: Partial<Record<BookSource, unknown>>,
  ): void {
    for (const [source, reason] of Object.entries(failures)) {
      // 첫 번째 기본 출처의 장애는 assertBaseFound가 그대로 던지므로 여기서 남기지 않는다.
      if (source === BOOK_BASE_SOURCES[0]) continue;
      if (reason instanceof NotFoundException) continue;

      this.logger.warn(
        `${source} 보충 조회 실패(무시하고 진행): ${String(reason)}`,
      );
    }
  }
}
