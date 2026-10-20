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
import { Yes24LookupResDto } from './yes24-lookup-res.dto';
import type {
  BookMetadataPatch,
  BookMetadataProvider,
} from '../book-metadata-provider';
import { ResponseYes24 } from './yes24.types';

// 해당 ISBN의 상품이 없을 때의 errorCode. HTTP 404와 함께 온다(2026-10-15 확인).
const YES24_NOT_FOUND = 'GOODS_002';

@Injectable()
export class Yes24BookSearchService implements BookMetadataProvider {
  readonly source = 'yes24' as const;
  private readonly logger = new Logger(Yes24BookSearchService.name);
  private readonly BASE_URL = 'https://apis.yes24.com/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  public async getByIsbn(isbn: string): Promise<BookMetadataPatch> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<ResponseYes24>(`${this.BASE_URL}/goods/itemDetail`, {
          // pages는 detail=Y일 때만 온다.
          params: { searchType: 'ISBN13', query: isbn, detail: 'Y' },
          headers: {
            'X-Api-Key': this.configService.get<string>('YES24_API_KEY'),
          },
        })
        .pipe(
          catchError((error: AxiosError<ResponseYes24>) => {
            // "상품 없음"은 HTTP 404로 온다. 장애와 구분해야 BookLookupService가
            // 경고 로그 없이 넘어갈 수 있다.
            if (error.response?.data?.errorCode === YES24_NOT_FOUND) {
              throw new NotFoundException(
                '해당 ISBN을 가진 책을 찾을 수 없습니다.',
              );
            }
            this.logger.error(
              `YES24 도서 조회 실패: ${JSON.stringify(error.response?.data)}`,
            );
            throw new BadGatewayException('YES24 도서 조회에 실패했습니다.');
          }),
        ),
    );

    if (!data?.success || !Array.isArray(data.data?.items)) {
      this.logger.error(`YES24 비정상 응답: ${JSON.stringify(data)}`);
      throw new BadGatewayException('YES24 도서 조회에 실패했습니다.');
    }

    const item = data.data.items.find((i) => i.isbn13 === isbn);
    if (!item) {
      throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
    }

    return Yes24LookupResDto.from(item);
  }
}
