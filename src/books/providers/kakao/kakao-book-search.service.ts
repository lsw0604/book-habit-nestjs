import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { PaginationUtil } from '../../../common';
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

    const meta = PaginationUtil.getPaginationMeta(data.meta.total_count, {
      pageNumber: page,
      pageSize: size,
    });

    const items = data.documents.map((doc) => KakaoBookItemDto.from(doc));

    return {
      meta,
      items,
    };
  }
}
