import { Yes24LookupResDto } from './yes24-lookup-res.dto';
import type { Yes24ItemRaw } from './yes24.types';

function item(overrides: Partial<Yes24ItemRaw> = {}): Yes24ItemRaw {
  return {
    itemId: 15058512,
    title: '미움받을 용기',
    isbn13: '9788996991342',
    pages: 336,
    link: 'https://www.yes24.com/product/goods/15058512',
    ...overrides,
  };
}

describe('Yes24LookupResDto.from', () => {
  it('페이지 수와 상품 링크만 꺼낸다', () => {
    expect(Yes24LookupResDto.from(item())).toEqual({
      totalPage: 336,
      url: 'https://www.yes24.com/product/goods/15058512',
    });
  });

  it.each([
    ['null', null],
    ['없음(detail=N)', undefined],
    ['0', 0],
  ])('pages가 %s이면 totalPage는 null이다("모름"은 null로만)', (_, pages) => {
    expect(Yes24LookupResDto.from(item({ pages })).totalPage).toBeNull();
  });

  it('link가 비어 있으면 url은 null이다', () => {
    expect(Yes24LookupResDto.from(item({ link: '' })).url).toBeNull();
  });
});
