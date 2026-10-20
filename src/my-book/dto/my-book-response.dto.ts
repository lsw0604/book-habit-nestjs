import { ApiProperty } from '@nestjs/swagger';
import { MyBookStatus } from '@prisma/client';
import { PaginationMeta, PaginationResponse } from '../../common/pagination';
import {
  BookCoverImageApiProperty,
  BookThumbnailApiProperty,
} from '../../books/dto/book-image.api-property';

export class MyBookDetailBookDto {
  @ApiProperty({ description: '책 제목', example: '미움받을 용기' })
  title: string;

  @ApiProperty({ description: '부제', nullable: true, type: String })
  subTitle: string | null;

  @ApiProperty({ description: 'ISBN', example: '9788996991342' })
  isbn: string;

  @ApiProperty({
    description: '저자 목록',
    example: ['기시미 이치로', '고가 후미타케'],
    type: [String],
  })
  authors: string[];

  @ApiProperty({
    description: '번역자 목록',
    example: ['전경아'],
    type: [String],
  })
  translators: string[];

  @ApiProperty({ description: '출판사', nullable: true, type: String })
  publisher: string | null;

  @ApiProperty(BookThumbnailApiProperty)
  thumbnail: string | null;

  @ApiProperty(BookCoverImageApiProperty)
  coverImage: string | null;

  @ApiProperty({
    description:
      'YES24 상품 상세 링크. YES24에 없는 책이면 null. 이 값이 있으면 YES24 Open API 약관(제6조)에 따라 ' +
      '화면에 "정보 제공: YES24" 출처와 이 링크를 함께 표시해야 한다(totalPage가 YES24에서 온 값일 수 있다).',
    nullable: true,
    type: String,
    example: 'https://www.yes24.com/product/goods/15058512',
  })
  url: string | null;

  @ApiProperty({
    description: '출판일 (YYYY-MM-DD)',
    nullable: true,
    type: String,
    example: '2014-11-17',
  })
  pubDate: string | null;

  @ApiProperty({ description: '총 페이지 수', nullable: true, type: Number })
  totalPage: number | null;
}

export class MyBookListItemBookDto {
  @ApiProperty({ description: '책 제목', example: '미움받을 용기' })
  title: string;

  @ApiProperty(BookThumbnailApiProperty)
  thumbnail: string | null;

  @ApiProperty({
    description: '총 페이지 수 (진행률 계산용)',
    nullable: true,
    type: Number,
  })
  totalPage: number | null;

  @ApiProperty({
    description:
      'ISBN13. 검색 결과(GET /books의 isbn)와 같은 정규화 형식이라, 문자열 비교로 서재 등록 여부를 알 수 있다',
    example: '9788996991342',
  })
  isbn: string;
}

export class MyBookCountDto {
  @ApiProperty({ description: '독서 세션(ReadingLog) 기록 수', example: 3 })
  readingLog: number;

  @ApiProperty({ description: '한줄평 작성 여부 (0 또는 1)', example: 1 })
  review: number;
}

export class MyBookResponseDto {
  @ApiProperty({ description: 'MyBook ID', example: 1 })
  id: number;

  @ApiProperty({ description: '상태', enum: MyBookStatus })
  status: MyBookStatus;

  @ApiProperty({ description: '평점 (0~5)', example: 4 })
  rating: number;

  @ApiProperty({ description: '현재 읽은 페이지', example: 120 })
  currentPage: number;

  @ApiProperty({
    description:
      '사용자가 직접 입력한 총 페이지 수. null이면 book.totalPage를 쓴다 (진행률 분모 = totalPage ?? book.totalPage)',
    type: Number,
    nullable: true,
    example: null,
  })
  totalPage: number | null;

  @ApiProperty({ description: '완독 횟수', example: 0 })
  readCount: number;

  @ApiProperty({
    description: '처음 CURRENTLY_READING으로 전환된 시각',
    nullable: true,
    type: Date,
  })
  startedAt: Date | null;

  @ApiProperty({
    description: '가장 최근 READ로 전환된 시각',
    nullable: true,
    type: Date,
  })
  finishedAt: Date | null;

  @ApiProperty({
    description: '가장 최근 ReadingLog 기록 시각',
    nullable: true,
    type: Date,
  })
  lastReadAt: Date | null;

  @ApiProperty({ description: '등록 시각', type: Date })
  createdAt: Date;

  @ApiProperty({ description: '수정 시각', type: Date })
  updatedAt: Date;

  @ApiProperty({ description: '책 정보', type: MyBookDetailBookDto })
  book: MyBookDetailBookDto;

  @ApiProperty({ description: '연관 데이터 개수', type: MyBookCountDto })
  _count: MyBookCountDto;
}

export class MyBookListItemDto {
  @ApiProperty({ description: 'MyBook ID', example: 1 })
  id: number;

  @ApiProperty({ description: '상태', enum: MyBookStatus })
  status: MyBookStatus;

  @ApiProperty({ description: '평점 (0~5)', example: 4 })
  rating: number;

  @ApiProperty({ description: '현재 읽은 페이지 (UI 진행률용)', example: 120 })
  currentPage: number;

  @ApiProperty({
    description:
      '사용자가 직접 입력한 총 페이지 수. null이면 book.totalPage를 쓴다 (진행률 분모 = totalPage ?? book.totalPage)',
    type: Number,
    nullable: true,
    example: null,
  })
  totalPage: number | null;

  @ApiProperty({ description: '완독 횟수', example: 0 })
  readCount: number;

  @ApiProperty({ description: '책 정보', type: MyBookListItemBookDto })
  book: MyBookListItemBookDto;
}

export class MyBookListResponseDto implements PaginationResponse<
  MyBookListItemDto,
  'items'
> {
  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ type: [MyBookListItemDto] })
  items: MyBookListItemDto[];
}
