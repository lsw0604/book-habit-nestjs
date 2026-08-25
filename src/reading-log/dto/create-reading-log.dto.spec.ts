import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateReadingLogDto } from './create-reading-log.dto';

function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateReadingLogDto, payload);
  return validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
}

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    myBookId: 1,
    startPage: 10,
    endPage: 20,
    startTime: '2026-01-01T10:00:00.000Z',
    endTime: '2026-01-01T11:00:00.000Z',
    date: '2026-01-01',
    ...overrides,
  };
}

describe('CreateReadingLogDto', () => {
  it('memo 없이도 통과한다', () => {
    expect(validateDto(basePayload())).toHaveLength(0);
  });

  // memo 컬럼은 VarChar(500)이라, 검증이 없으면 초과 입력이 DB 레벨에서 터진다.
  // readingMood(enum)를 없애고 감상까지 memo에 적게 되면서 긴 입력 가능성이 커졌다.
  describe('memo 길이 검증', () => {
    it('500자까지는 통과한다', () => {
      const errors = validateDto(basePayload({ memo: 'ㄱ'.repeat(500) }));

      expect(errors).toHaveLength(0);
    });

    it('500자를 초과하면 거부한다', () => {
      const errors = validateDto(basePayload({ memo: 'ㄱ'.repeat(501) }));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('memo');
      expect(Object.values(errors[0].constraints ?? {})).toContain(
        '메모는 500자를 초과할 수 없습니다.',
      );
    });
  });

  describe('date 형식', () => {
    // 자정 ISO datetime을 받으면 타임존 해석이 갈려 하루가 밀린다.
    // 날짜 문자열만 허용해 해석 여지를 없앤다.
    it.each([
      ['2025-12-11T00:00:00.000Z', 'ISO datetime'],
      ['2025-12-10T15:00:00.000Z', 'KST 자정의 ISO 표현'],
      ['2025/12/11', '슬래시 구분'],
      ['20251211', '구분자 없음'],
    ])('%s (%s)는 거부한다', (value) => {
      const errors = validateDto(basePayload({ date: value }));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('date');
    });

    it('YYYY-MM-DD는 통과한다', () => {
      expect(validateDto(basePayload({ date: '2025-12-11' }))).toHaveLength(0);
    });
  });

  // 제거된 필드를 그대로 보내면 조용히 무시되는 게 아니라 거부되어야 한다
  // (ValidationPipe가 forbidNonWhitelisted로 설정되어 있음 - main.ts 참고).
  describe('제거된 필드 거부', () => {
    it.each([
      ['readingMood', 'INSPIRED'],
      // 이제 서버가 startTime~endTime에서 파생하므로 클라이언트가 보내면 안 된다.
      ['readingMinutes', 60],
    ])('%s를 보내면 거부한다', (field, value) => {
      const errors = validateDto(basePayload({ [field]: value }));

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
    });
  });
});
