import { BadRequestException } from '@nestjs/common';
import {
  partitionBookNoteSections,
  toBookNoteSections,
} from './book-note-sections.util';

describe('partitionBookNoteSections', () => {
  it('값이 있는 섹션과 비운 섹션을 나눈다(공백만 있으면 비움)', () => {
    expect(
      partitionBookNoteSections('BON_KKAE_JEOK', [
        { key: 'seen', content: '핵심 내용' },
        { key: 'realized', content: '   ' },
      ]),
    ).toEqual({
      filled: [{ key: 'seen', content: '핵심 내용' }],
      emptyKeys: ['realized'],
    });
  });

  it('요청에 없는 섹션은 어느 쪽에도 넣지 않는다(부분 저장)', () => {
    const { filled, emptyKeys } = partitionBookNoteSections('BON_KKAE_JEOK', [
      { key: 'apply', content: '매일 10쪽' },
    ]);

    expect(filled.map(({ key }) => key)).toEqual(['apply']);
    expect(emptyKeys).toEqual([]);
  });

  it.each([
    ['템플릿에 없는 key', [{ key: 'learned', content: 'x' }]],
    [
      '같은 key 중복',
      [
        { key: 'seen', content: 'a' },
        { key: 'seen', content: 'b' },
      ],
    ],
    ['maxLength 초과', [{ key: 'seen', content: 'a'.repeat(1001) }]],
  ])('%s는 400이다', (_, sections) => {
    expect(() => partitionBookNoteSections('BON_KKAE_JEOK', sections)).toThrow(
      BadRequestException,
    );
  });

  it('maxLength와 같은 길이는 허용한다', () => {
    expect(() =>
      partitionBookNoteSections('BON_KKAE_JEOK', [
        { key: 'seen', content: 'a'.repeat(1000) },
      ]),
    ).not.toThrow();
  });
});

describe('toBookNoteSections', () => {
  it('템플릿 정의 순서대로 모든 섹션을 펼치고, 행이 없는 섹션은 빈 값으로 채운다', () => {
    const updatedAt = new Date('2026-10-20T00:00:00.000Z');

    expect(
      toBookNoteSections('KWL', [
        { key: 'learned', content: '알게 된 것', updatedAt },
      ]),
    ).toEqual([
      { key: 'know', label: '이미 알던 것', content: '', updatedAt: null },
      { key: 'want', label: '알고 싶은 것', content: '', updatedAt: null },
      {
        key: 'learned',
        label: '새로 알게 된 것',
        content: '알게 된 것',
        updatedAt,
      },
    ]);
  });

  it('템플릿에 없는 key의 행은 버린다', () => {
    const sections = toBookNoteSections('ONE_SENTENCE', [
      { key: 'seen', content: '다른 템플릿의 섹션', updatedAt: new Date() },
    ]);

    expect(sections.map(({ key }) => key)).toEqual(['summary', 'reason']);
    expect(sections.every(({ content }) => content === '')).toBe(true);
  });
});
