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
import { Data4LibraryLookupResDto } from './data4library-lookup-res.dto';
import { ResponseData4LibraryDetail } from './data4library.types';

@Injectable()
export class Data4LibraryBookSearchService {
  private readonly logger = new Logger(Data4LibraryBookSearchService.name);
  private readonly BASE_URL = 'https://data4library.kr/api/srchDtlList';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  public async getByIsbn(isbn: string): Promise<Data4LibraryLookupResDto> {
    const authKey = this.configService.get<string>('DATA4LIBRARY_AUTH_KEY');

    const { data } = await firstValueFrom(
      this.httpService
        .get<ResponseData4LibraryDetail>(this.BASE_URL, {
          params: {
            authKey,
            isbn13: isbn,
            loaninfoYN: 'N', // 대출 통계는 쓰지 않으므로 응답을 가볍게 한다.
            format: 'json',
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `정보나루 도서 조회 실패: ${JSON.stringify(error.response?.data)}`,
            );
            throw new BadGatewayException('정보나루 도서 조회에 실패했습니다.');
          }),
        ),
    );

    // 인증 실패 등은 HTTP 200에 response.error로 온다. 이를 "책 없음"(404)으로
    // 삼키면 설정 문제가 가려지므로 502로 구분한다.
    const detail = data?.response?.detail;
    if (data?.response?.error || !Array.isArray(detail)) {
      this.logger.error(`정보나루 비정상 응답: ${JSON.stringify(data)}`);
      throw new BadGatewayException('정보나루 도서 조회에 실패했습니다.');
    }

    const book = detail.find((item) => item.book?.isbn13 === isbn)?.book;
    if (!book) {
      throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
    }

    return Data4LibraryLookupResDto.from(book);
  }
}
