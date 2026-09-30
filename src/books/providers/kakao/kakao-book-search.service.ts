import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PaginationUtil } from '../../../common';
import { KAKAO_MAX_PAGE } from './kakao.constants';
import { parseKakaoIdentifier } from './kakao-identifier.util';
import { KakaoLookupResDto } from './kakao-lookup-res.dto';
import { ResponseKakaoSearchBook } from './kakao.types';
import { KakaoSearchReqDto } from './kakao-search-req.dto';
import { KakaoBookItemDto } from './kakao-search-res.dto';
import { KakaoSearchResultDto } from './kakao-search-result.dto';

@Injectable()
export class KakaoBookSearchService {
  private readonly logger = new Logger(KakaoBookSearchService.name);
  private readonly BASE_URL = 'https://dapi.kakao.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  public async search(
    params: KakaoSearchReqDto,
  ): Promise<KakaoSearchResultDto> {
    const {
      query,
      sort = 'accuracy',
      page = 1,
      size = 10,
      target = 'title',
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('query', query);
    queryParams.append('sort', sort);
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    queryParams.append('target', target);

    const data = await this.request(queryParams);

    // total_count(검색된 전체 문서 수)로 계산하면 안 된다. 2026-09-30 실제 호출 결과:
    // - 실제로 넘겨볼 수 있는 건 pageable_count까지이고, 이 값은 최대 1000이다
    //   ("소설": total_count 79265, pageable_count 1000).
    // - 마지막 페이지를 넘겨 요청하면 카카오는 에러 없이 마지막 페이지를 계속 다시 준다
    //   (size 50이면 21~51페이지가 모두 20페이지와 같음). total_count로 계산하면
    //   무한 스크롤에서 같은 책이 반복되다가 KAKAO_MAX_PAGE를 넘는 순간 400이 난다.
    // 그래서 pageable_count와 우리 page 상한(KAKAO_MAX_PAGE) 중 작은 쪽으로 계산한다.
    const reachableCount = Math.min(
      data.meta.pageable_count,
      KAKAO_MAX_PAGE * size,
    );
    const meta = PaginationUtil.getPaginationMeta(reachableCount, {
      pageNumber: page,
      pageSize: size,
    });

    // is_end는 카카오가 직접 알려주는 "마지막 페이지" 여부라 계산값보다 우선한다.
    if (data.meta.is_end) {
      meta.hasNextPage = false;
      meta.nextPage = undefined;
    }

    const items = data.documents.map((doc) => KakaoBookItemDto.from(doc));

    return {
      meta,
      items,
    };
  }

  /**
   * ISBN-13으로 책 한 권을 조회해 Book 모양으로 돌려준다.
   * target=isbn 검색은 여러 권을 줄 수 있어서, isbn이 정확히 같은 문서만 쓴다.
   */
  public async getByIsbn(isbn: string): Promise<KakaoLookupResDto> {
    const queryParams = new URLSearchParams();
    queryParams.append('query', isbn);
    queryParams.append('target', 'isbn');

    const data = await this.request(queryParams);

    const doc = data.documents.find(
      (document) => parseKakaoIdentifier(document.isbn).isbn === isbn,
    );
    if (!doc) {
      throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
    }

    return KakaoLookupResDto.from(doc, isbn);
  }

  private async request(
    queryParams: URLSearchParams,
  ): Promise<ResponseKakaoSearchBook> {
    const url = `${this.BASE_URL}/v3/search/book?${queryParams.toString()}`;

    const { data } = await firstValueFrom(
      this.httpService
        .get<ResponseKakaoSearchBook>(url, {
          headers: {
            Authorization: `KakaoAK ${this.configService.get<string>('KAKAO_REST_API')}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `카카오 도서 검색 실패: ${JSON.stringify(error.response?.data)}`,
            );
            throw new BadGatewayException('카카오 도서 검색에 실패했습니다.');
          }),
        ),
    );

    return data;
  }
}
