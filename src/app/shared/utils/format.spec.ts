import { describe, expect, it } from 'vitest';

import { formatCountdown, formatRelativeDay, greetingVi, weekdayShortVi } from './format';

describe('formatCountdown', () => {
  it('định dạng ngắn theo ngày/giờ/phút', () => {
    expect(formatCountdown(2 * 3_600_000 + 15 * 60_000)).toBe('2g 15p');
    expect(formatCountdown(3 * 86_400_000 + 2 * 3_600_000)).toBe('3n 2g');
    expect(formatCountdown(15 * 60_000)).toBe('15p');
    expect(formatCountdown(0)).toBe('Bây giờ');
  });
});

describe('formatRelativeDay', () => {
  it('nhãn tương đối so với hôm nay', () => {
    expect(formatRelativeDay('2026-10-09', '2026-10-09')).toBe('Hôm nay');
    expect(formatRelativeDay('2026-10-10', '2026-10-09')).toBe('Ngày mai');
    expect(formatRelativeDay('2026-10-13', '2026-10-09')).toBe('4 ngày');
  });
});

describe('greetingVi', () => {
  it('đổi lời chào theo giờ', () => {
    expect(greetingVi(8)).toBe('Chào buổi sáng');
    expect(greetingVi(14)).toBe('Chào buổi chiều');
    expect(greetingVi(20)).toBe('Chào buổi tối');
  });
});

describe('weekdayShortVi', () => {
  it('trả nhãn ngắn đúng thứ', () => {
    expect(weekdayShortVi('2026-10-09')).toBe('T6');
    expect(weekdayShortVi('2026-10-11')).toBe('CN');
  });
});
