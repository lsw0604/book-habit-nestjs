import { normalizeIsbn13 } from '../../../common';

export const BOOK_IDENTIFIER_TYPES = ['ISBN', 'ISSN', 'UNKNOWN'] as const;
export type BookIdentifierType = (typeof BOOK_IDENTIFIER_TYPES)[number];

export type KakaoIdentifier = {
  /** 정규화된 ISBN-13. ISBN 도서가 아니면 null */
  isbn: string | null;
  identifierType: BookIdentifierType;
};

/**
 * 카카오 도서 응답의 isbn 필드를 해석한다. 2026-09-30 실제 응답에서 확인한 형식:
 * - "8996991341 9788996991342": ISBN10과 ISBN13을 공백으로 이어 줌
 * - "9771228402006 9771228402006": 잡지. 977로 시작하는 ISSN(EAN-13)
 * - "1228402000 9771228402006": 잡지. 앞의 10자리는 ISSN에서 파생된 값인데
 *   ISBN-10 체크섬을 통과해 isbn3가 영어권 ISBN(9781228402005)으로 바꿔버린다.
 * - " 480D211142010": ISBN도 ISSN도 아닌 내부 코드
 *
 * 그래서 13자리를 먼저 보고, 13자리가 ISSN이면 10자리는 아예 보지 않는다.
 * 10자리는 13자리로 판별이 안 될 때만 쓴다.
 *
 * normalizeIsbn13은 사용자 입력 검증용이라 이 형식을 거부하도록 엄격하게 둔다.
 * 카카오 특유의 형식 해석은 여기서만 한다.
 */
export function parseKakaoIdentifier(raw: string | undefined): KakaoIdentifier {
  const tokens = raw?.trim().split(/\s+/).filter(Boolean) ?? [];
  const thirteens = tokens.filter((token) => token.length === 13);
  const tens = tokens.filter((token) => token.length === 10);

  for (const token of thirteens) {
    const isbn = normalizeIsbn13(token);
    if (isbn) return { isbn, identifierType: 'ISBN' };
  }

  if (thirteens.some(isIssnEan13)) {
    return { isbn: null, identifierType: 'ISSN' };
  }

  for (const token of tens) {
    const isbn = normalizeIsbn13(token);
    if (isbn) return { isbn, identifierType: 'ISBN' };
  }

  return { isbn: null, identifierType: 'UNKNOWN' };
}

// ISSN을 바코드로 쓸 때의 EAN-13 형식: 977로 시작하고 EAN-13 체크섬이 맞아야 한다.
function isIssnEan13(value: string): boolean {
  if (!/^977\d{10}$/.test(value)) return false;

  const digits = [...value].map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce((acc, digit, i) => acc + digit * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}
