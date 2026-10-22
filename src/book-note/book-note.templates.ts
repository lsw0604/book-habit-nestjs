import type { BookNoteTemplate } from '@prisma/client';

export interface BookNoteSectionDef {
  /** DB의 BookNoteSection.key. 템플릿 안에서 유일해야 한다(VarChar(30)). */
  key: string;
  label: string;
  /** 입력란 위에 보여줄 안내 질문. */
  prompt: string;
  placeholder: string;
  maxLength: number;
}

export interface BookNoteTemplateDef {
  name: string;
  description: string;
  /** 처음 기록하는 사람에게 권하는 템플릿인지. */
  recommended: boolean;
  sections: readonly BookNoteSectionDef[];
}

const MAX_LENGTH = 1000;

/**
 * 독서 노트 기록법 템플릿. 섹션 키 검증과 클라이언트 표시(GET /book-note/templates)의
 * 단일 출처다 - 클라이언트는 문구를 하드코딩하지 않는다.
 *
 * enum(BookNoteTemplate)에 값을 추가하고 여기에 정의를 빠뜨리면 tsc가 실패한다.
 * 이미 저장된 노트가 있는 템플릿의 섹션 key를 바꾸거나 지우면 그 행은 응답에서 사라진다
 * (toBookNoteSections가 템플릿에 없는 key를 버린다). key는 바꾸지 말고 추가만 한다.
 */
export const BOOK_NOTE_TEMPLATES = {
  ONE_SENTENCE: {
    name: '한 문장 정리',
    description: '이 책을 한 문장으로 줄이고, 그 이유를 적어요.',
    recommended: true,
    sections: [
      {
        key: 'summary',
        label: '한 문장',
        prompt: '이 책을 한 문장으로 말한다면?',
        placeholder: '예: 남의 기대가 아니라 내 과제에 집중하라는 책',
        maxLength: MAX_LENGTH,
      },
      {
        key: 'reason',
        label: '그렇게 생각한 이유',
        prompt: '왜 그 문장을 골랐나요?',
        placeholder:
          '기억에 남는 장면이나 내 경험과 이어지는 부분을 적어 보세요',
        maxLength: MAX_LENGTH,
      },
    ],
  },
  BON_KKAE_JEOK: {
    name: '본깨적',
    description: '본 것, 깨달은 것, 적용할 것으로 나눠 정리해요.',
    recommended: false,
    sections: [
      {
        key: 'seen',
        label: '본 것',
        prompt: '책에서 중요하게 본 내용은 무엇인가요?',
        placeholder: '저자가 말하는 핵심 내용을 내 말로 적어 보세요',
        maxLength: MAX_LENGTH,
      },
      {
        key: 'realized',
        label: '깨달은 것',
        prompt: '읽으며 새롭게 깨달은 것은 무엇인가요?',
        placeholder: '생각이 바뀐 부분이나 새로 보인 것을 적어 보세요',
        maxLength: MAX_LENGTH,
      },
      {
        key: 'apply',
        label: '적용할 것',
        prompt: '내 삶에 옮겨 볼 한 가지는 무엇인가요?',
        placeholder: '작고 구체적인 행동일수록 좋아요',
        maxLength: MAX_LENGTH,
      },
    ],
  },
  KWL: {
    name: 'KWL',
    description:
      '읽기 전에 아는 것과 궁금한 것을 적고, 다 읽은 뒤 알게 된 것을 적어요.',
    recommended: false,
    sections: [
      {
        key: 'know',
        label: '이미 알던 것',
        prompt: '읽기 전에: 이 주제에 대해 이미 알고 있는 것은?',
        placeholder: '떠오르는 대로 적어 보세요',
        maxLength: MAX_LENGTH,
      },
      {
        key: 'want',
        label: '알고 싶은 것',
        prompt: '읽기 전에: 이 책에서 알고 싶은 것은?',
        placeholder: '질문 형태로 적으면 읽을 때 답을 찾기 쉬워요',
        maxLength: MAX_LENGTH,
      },
      {
        key: 'learned',
        label: '새로 알게 된 것',
        prompt: '다 읽은 뒤에: 새로 알게 된 것은?',
        placeholder: '앞에서 적은 질문의 답을 찾았는지도 적어 보세요',
        maxLength: MAX_LENGTH,
      },
    ],
  },
  THREE_TWO_ONE: {
    name: '3-2-1',
    description:
      '기억할 것 3가지, 마음에 남은 문장 2개, 남은 질문 1개를 적어요.',
    recommended: false,
    sections: [
      {
        key: 'takeaways',
        label: '기억할 것 3가지',
        prompt: '이 책에서 기억하고 싶은 3가지는?',
        placeholder: '1. \n2. \n3. ',
        maxLength: MAX_LENGTH,
      },
      {
        key: 'quotes',
        label: '마음에 남은 문장 2개',
        prompt: '마음에 남은 문장 2개는?',
        placeholder: '쪽수도 함께 적어 두면 다시 찾기 쉬워요',
        maxLength: MAX_LENGTH,
      },
      {
        key: 'question',
        label: '남은 질문 1개',
        prompt: '읽고 나서도 남은 질문 하나는?',
        placeholder: '다음에 읽을 책을 고르는 단서가 되기도 해요',
        maxLength: MAX_LENGTH,
      },
    ],
  },
  FREE: {
    name: '자유 노트',
    description: '정해진 틀 없이 자유롭게 적어요.',
    recommended: false,
    sections: [
      {
        key: 'body',
        label: '노트',
        prompt: '이 책에 대해 남기고 싶은 것을 자유롭게 적어 보세요.',
        placeholder: '',
        maxLength: MAX_LENGTH * 3,
      },
    ],
  },
} as const satisfies Record<BookNoteTemplate, BookNoteTemplateDef>;

/**
 * 모든 템플릿의 섹션 key(선언 순서, 중복 제거). 클라이언트 생성 타입이 string 대신 key 유니온이
 * 되도록 Swagger enum으로만 노출한다. 어떤 key가 어떤 템플릿에 속하는지는 담지 못하므로
 * 실제 검증은 여전히 partitionBookNoteSections가 템플릿 기준으로 한다(DB도 string 그대로).
 */
export const BOOK_NOTE_SECTION_KEYS: readonly string[] = [
  ...new Set(
    Object.values<BookNoteTemplateDef>(BOOK_NOTE_TEMPLATES).flatMap((def) =>
      def.sections.map((section) => section.key),
    ),
  ),
];

/** Swagger 스키마 컴포넌트 이름. 세 DTO가 같은 enum을 공유하게 한다. */
export const BOOK_NOTE_SECTION_KEY_ENUM_NAME = 'BookNoteSectionKey';
