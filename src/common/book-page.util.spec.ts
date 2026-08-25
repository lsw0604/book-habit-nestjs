import { BadRequestException } from '@nestjs/common';
import { assertWithinTotalPage } from './book-page.util';

describe('assertWithinTotalPage', () => {
  const message = '페이지는 전체 페이지 수를 초과할 수 없습니다.';

  it('page가 totalPage 이하이면 통과한다', () => {
    expect(() => assertWithinTotalPage(50, 100, message)).not.toThrow();
  });

  it('page가 totalPage와 같으면 통과한다', () => {
    expect(() => assertWithinTotalPage(100, 100, message)).not.toThrow();
  });

  it('page가 totalPage를 초과하면 BadRequestException을 던진다', () => {
    expect(() => assertWithinTotalPage(101, 100, message)).toThrow(
      BadRequestException,
    );
    expect(() => assertWithinTotalPage(101, 100, message)).toThrow(message);
  });

  it('totalPage가 null이면 검증하지 않는다', () => {
    expect(() => assertWithinTotalPage(999, null, message)).not.toThrow();
  });

  it('totalPage가 0이면 검증하지 않는다', () => {
    expect(() => assertWithinTotalPage(999, 0, message)).not.toThrow();
  });
});
