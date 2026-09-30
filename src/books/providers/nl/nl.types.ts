// 국립중앙도서관 ISBN 서지정보 API(seoji) 응답.
// 모든 값이 문자열로 오며, 값이 없는 필드는 빈 문자열('')로 온다.
// https://www.nl.go.kr/NL/contents/N31101030500.do
export type ResponseNlSearchBook = {
  PAGE_NO: string;
  TOTAL_COUNT: string;
  docs: NlDocumentRaw[];
};

export type NlDocumentRaw = {
  TITLE: string;
  VOL: string;
  SERIES_TITLE: string;
  SERIES_NO: string;
  AUTHOR: string;
  EA_ISBN: string;
  EA_ADD_CODE: string;
  SET_ISBN: string;
  SET_ADD_CODE: string;
  SET_EXPRESSION: string;
  PUBLISHER: string;
  EDITION_STMT: string;
  PRE_PRICE: string;
  KDC: string;
  DDC: string;
  PAGE: string;
  BOOK_SIZE: string;
  FORM: string;
  PUBLISH_PREDATE: string;
  SUBJECT: string;
  EBOOK_YN: string;
  CIP_YN: string;
  CONTROL_NO: string;
  TITLE_URL: string;
  BOOK_TB_CNT_URL: string;
  BOOK_INTRODUCTION_URL: string;
  BOOK_SUMMARY_URL: string;
  PUBLISHER_URL: string;
  INPUT_DATE: string;
  UPDATE_DATE: string;
  BOOK_INTRODUCTION?: string;
  DEPOSIT_YN?: string;
  REAL_PRICE?: string;
  RELATED_ISBN?: string;
};
