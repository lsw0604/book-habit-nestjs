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
import { AladinLookupResDto } from './aladin-lookup-res.dto';
import { ResponseAladinSearchBook } from './aladin.types';

@Injectable()
export class AladinBookSearchService {
  private readonly logger = new Logger(AladinBookSearchService.name);
  private readonly BASE_URL = 'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  public async getByIsbn(isbn: string): Promise<AladinLookupResDto> {
    const ttbKey = this.configService.get<string>('ALADIN_TTB_KEY');

    const { data } = await firstValueFrom(
      this.httpService
        .get<ResponseAladinSearchBook>(this.BASE_URL, {
          params: {
            ttbkey: ttbKey,
            itemIdType: 'ISBN13', // ISBN13으로 검색 설정
            ItemId: isbn, // 검색할 ISBN
            Output: 'js', // JSON 형식으로 응답 받기 (기본값은 xml)
            Version: '20131101', // 최신 필드(BestSellerRank 등)를 받기 위한 버전 설정
            Cover: 'Big', // 큰 표지 이미지 요청
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `알라딘 도서 조회 실패: ${JSON.stringify(error.response?.data)}`,
            );
            throw new BadGatewayException('알라딘 도서 조회에 실패했습니다.');
          }),
        ),
    );

    if (!data.item || !data.item[0]) {
      throw new NotFoundException('해당 ISBN을 가진 책을 찾을 수 없습니다.');
    }

    return AladinLookupResDto.from(data.item[0]);
  }
}
