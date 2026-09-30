import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';
import { NlLookupResDto } from './nl-lookup-res.dto';
import { ResponseNlSearchBook } from './nl.types';

@Injectable()
export class NlBookSearchService {
  private readonly logger = new Logger(NlBookSearchService.name);
  private readonly BASE_URL = 'https://www.nl.go.kr/seoji/SearchApi.do';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  public async getByIsbn(isbn: string): Promise<NlLookupResDto> {
    const certKey = this.configService.get<string>('NL_CERT_KEY');

    const { data } = await firstValueFrom(
      this.httpService
        .get<ResponseNlSearchBook>(this.BASE_URL, {
          params: {
            cert_key: certKey,
            result_style: 'json',
            page_no: 1,
            page_size: 10,
            isbn,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `국립중앙도서관 도서 조회 실패: ${JSON.stringify(error.response?.data)}`,
            );
            throw new BadGatewayException(
              '국립중앙도서관 도서 조회에 실패했습니다.',
            );
          }),
        ),
    );

    // 인증키 오류 등은 HTTP 200에 docs 없이 에러 본문으로 온다.
    // 이를 "책 없음"(404)으로 삼키면 설정 문제가 가려지므로 502로 구분한다.
    if (!Array.isArray(data?.docs)) {
      this.logger.error(`국립중앙도서관 비정상 응답: ${JSON.stringify(data)}`);
      throw new BadGatewayException('국립중앙도서관 도서 조회에 실패했습니다.');
    }

    // isbn 파라미터는 우절단(prefix) 검색이라 다른 ISBN이 섞여 올 수 있다.
    const doc = data.docs.find((d) => d.EA_ISBN === isbn);
    if (!doc) {
      throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
    }

    return NlLookupResDto.from(doc);
  }
}
