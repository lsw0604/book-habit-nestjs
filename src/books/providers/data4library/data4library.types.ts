// 도서관 정보나루 도서 상세 조회 API(srchDtlList) 응답.
// https://www.data4library.kr/apiUtilization
// 인증 실패 등 에러도 HTTP 200으로 오며, 이때는 detail 대신
// { errCode: 'authErr', error: '인증정보가 일치하지 않습니다.' }가 담긴다.
export type ResponseData4LibraryDetail = {
  response: {
    request?: { isbn13: string; loaninfoYN?: string };
    detail?: { book: Data4LibraryBookRaw }[];
    errCode?: string;
    error?: string;
  };
};

export type Data4LibraryBookRaw = {
  no?: number;
  bookname: string;
  authors: string;
  publisher: string;
  bookImageURL: string;
  description: string;
  publication_year: string;
  publication_date: string;
  isbn: string;
  isbn13: string;
  addition_symbol?: string;
  vol: string;
  class_no: string;
  class_nm: string;
};
