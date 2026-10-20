import { BadRequestException } from '@nestjs/common';
import type { BookNoteTemplate } from '@prisma/client';
import {
  BOOK_NOTE_TEMPLATES,
  type BookNoteSectionDef,
} from './book-note.templates';

// 템플릿마다 섹션 튜플 타입이 달라 그대로 map하면 유니온이 풀리지 않는다. 공통 타입으로 넓힌다.
function sectionDefs(
  template: BookNoteTemplate,
): readonly BookNoteSectionDef[] {
  return BOOK_NOTE_TEMPLATES[template].sections;
}

export interface BookNoteSectionInput {
  key: string;
  content: string;
}

export interface BookNoteSectionView {
  key: string;
  label: string;
  content: string;
  updatedAt: Date | null;
}

/**
 * 요청 섹션을 템플릿 정의에 비춰 검증하고, 저장할 것(filled)과 지울 것(emptyKeys)으로 나눈다.
 *
 * - 템플릿에 없는 key, 같은 key 중복, maxLength 초과는 400이다.
 * - 공백만 있는 content는 "비움"으로 보고 행을 지운다(빈 섹션은 행을 두지 않는다).
 * - 요청에 없는 key는 어느 쪽에도 넣지 않는다 - 일부 섹션만 보내는 저장을 허용한다.
 */
export function partitionBookNoteSections(
  template: BookNoteTemplate,
  sections: readonly BookNoteSectionInput[],
): { filled: BookNoteSectionInput[]; emptyKeys: string[] } {
  const defs = new Map(sectionDefs(template).map((def) => [def.key, def]));
  const seen = new Set<string>();
  const filled: BookNoteSectionInput[] = [];
  const emptyKeys: string[] = [];

  for (const { key, content } of sections) {
    const def = defs.get(key);
    if (!def) {
      throw new BadRequestException(
        `'${key}'는 ${template} 템플릿의 섹션이 아닙니다.`,
      );
    }
    if (seen.has(key)) {
      throw new BadRequestException(`'${key}' 섹션이 중복되었습니다.`);
    }
    seen.add(key);

    if (content.length > def.maxLength) {
      throw new BadRequestException(
        `'${key}' 섹션은 ${def.maxLength}자를 넘을 수 없습니다.`,
      );
    }

    if (content.trim() === '') emptyKeys.push(key);
    else filled.push({ key, content });
  }

  return { filled, emptyKeys };
}

/**
 * 저장된 섹션 행을 템플릿 정의 순서대로 펼친다. 행이 없는 섹션은 content '' / updatedAt null로
 * 채워서, 클라이언트가 템플릿 정의를 따로 합치지 않아도 되게 한다. 템플릿에 없는 key의 행은 버린다.
 */
export function toBookNoteSections(
  template: BookNoteTemplate,
  rows: readonly { key: string; content: string; updatedAt: Date }[],
): BookNoteSectionView[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return sectionDefs(template).map(({ key, label }) => {
    const row = byKey.get(key);
    return {
      key,
      label,
      content: row?.content ?? '',
      updatedAt: row?.updatedAt ?? null,
    };
  });
}
