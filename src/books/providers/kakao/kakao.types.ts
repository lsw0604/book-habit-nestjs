export type ResponseKakaoSearchBook = {
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
  documents: KakaoDocument[];
};

export type KakaoDocument = {
  title: string; //	도서 제목
  contents: string; //	도서 소개
  url: string; //	도서 상세 URL
  isbn: string; //	ISBN10(10자리) 또는 ISBN13(13자리) 형식의 국제 표준 도서번호(International Standard Book Number)
  datetime: string; //	도서 출판날짜, ISO 8601 형식
  authors: string[]; //	도서 저자 리스트
  publisher: string; //	도서 출판사
  translators: string[]; //  도서 번역자 리스트
  price: number; //	도서 정가
  sale_price: number; //	도서 판매가
  thumbnail: string; //	도서 표지 미리보기 URL
  status: string; //  도서 판매 상태 정보 (정상, 품절, 절판 등)
};
