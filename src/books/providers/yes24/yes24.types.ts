// YES24 Open API 응답. https://developers.yes24.com/api-doc/goods-item-detail
// 쓰는 필드만 적었다. 전체 필드는 위 문서 참고.
export type ResponseYes24 = {
  success: boolean;
  message: string;
  // 실패하면 null이고 errorCode가 채워진다(예: GOODS_002 = 해당 ISBN 상품 없음).
  data: { items: Yes24ItemRaw[] } | null;
  errorCode: string | null;
};

export type Yes24ItemRaw = {
  itemId: number;
  title: string;
  isbn13: string;
  // detail=Y일 때만 온다.
  pages?: number | null;
  // 상품 상세 페이지 URL. 예: 'https://www.yes24.com/product/goods/11681152'
  link: string;
};
