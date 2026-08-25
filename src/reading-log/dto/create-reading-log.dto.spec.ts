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
    readingMinutes: 60,
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

  // enum이 사라졌으므로 예전 필드를 그대로 보내면 조용히 무시되는 게 아니라 거부되어야 한다
  // (ValidationPipe가 forbidNonWhitelisted로 설정되어 있음 - main.ts 참고).
  it('제거된 readingMood를 보내면 거부한다', () => {
    const errors = validateDto(basePayload({ readingMood: 'INSPIRED' }));

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('readingMood');
  });
});
