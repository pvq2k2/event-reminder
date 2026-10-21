import { describe, expect, it } from 'vitest';

import type { AppEvent, RecurrenceRule } from './models';
import { getOccurrencesInRange, nextOccurrence } from './recurrence';

const make = (rule: RecurrenceRule, over: Partial<AppEvent> = {}): AppEvent => ({
  id: 'e1',
  title: 'Test',
  startDate: '2026-01-01',
  startTime: '19:00',
  timezone: 'Asia/Ho_Chi_Minh',
  isAllDay: false,
  calendarSystem: 'gregorian',
  category: 'other',
  status: 'active',
  rule,
  reminders: [],
  exceptions: [],
  contactIds: [],
  createdAt: '',
  updatedAt: '',
  ...over,
});
const dates = (e: AppEvent, a: string, b: string) => getOccurrencesInRange(e, a, b).map((o) => o.date);
const never = { type: 'never' } as const;

describe('getOccurrencesInRange', () => {
  it('sự kiện một lần', () => {
    const e = make({ kind: 'none' }, { startDate: '2026-10-09' });
    expect(dates(e, '2026-10-01', '2026-10-31')).toEqual(['2026-10-09']);
    expect(dates(e, '2026-11-01', '2026-11-30')).toEqual([]);
    expect(getOccurrencesInRange(e, '2026-10-01', '2026-10-31')[0].occurrenceKey).toBe('e1:single');
  });

  it('mang theo địa điểm và các mốc nhắc đang bật', () => {
    const e = make(
      { kind: 'none' },
      {
        startDate: '2026-10-09',
        location: 'Nhà bác cả',
        reminders: [
          { id: 'r1', offsetMinutes: 30, enabled: true },
          { id: 'r2', offsetMinutes: 1440, enabled: false },
        ],
      },
    );
    const [occ] = getOccurrencesInRange(e, '2026-10-01', '2026-10-31');
    expect(occ.location).toBe('Nhà bác cả');
    expect(occ.reminderOffsets).toEqual([30]);
  });

  it('hằng ngày mỗi 3 ngày, kết thúc sau 3 lần', () => {
    const e = make({ kind: 'daily', interval: 3, end: { type: 'count', count: 3 } });
    expect(dates(e, '2026-01-01', '2026-12-31')).toEqual(['2026-01-01', '2026-01-04', '2026-01-07']);
  });

  it('hằng tuần nhiều thứ (CN, T2, T4; 0 = CN) và dừng theo ngày', () => {
    // 2026-01-05 là thứ Hai
    const e = make(
      { kind: 'weekly', interval: 1, weekdays: [0, 3, 1], end: { type: 'until', date: '2026-01-14' } },
      { startDate: '2026-01-05' },
    );
    expect(dates(e, '2026-01-01', '2026-02-01')).toEqual([
      '2026-01-05',
      '2026-01-07',
      '2026-01-11',
      '2026-01-12',
      '2026-01-14',
    ]);
  });

  it('hằng tuần mỗi 2 tuần', () => {
    const e = make({ kind: 'weekly', interval: 2, weekdays: [1], end: never }, { startDate: '2026-01-05' });
    expect(dates(e, '2026-01-01', '2026-02-10')).toEqual(['2026-01-05', '2026-01-19', '2026-02-02']);
  });

  it('hằng tháng ngày 31: clamp vs skip', () => {
    const clamp = make(
      { kind: 'monthly', interval: 1, monthDay: 31, missingDay: 'clamp', end: never },
      { startDate: '2026-01-31' },
    );
    const skip = make(
      { kind: 'monthly', interval: 1, monthDay: 31, missingDay: 'skip', end: never },
      { startDate: '2026-01-31' },
    );
    expect(dates(clamp, '2026-01-01', '2026-04-30')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    expect(dates(skip, '2026-01-01', '2026-04-30')).toEqual(['2026-01-31', '2026-03-31']);
  });

  it('hằng năm dương lịch, 29/2 chuyển về 28/2 năm thường', () => {
    const e = make({ kind: 'yearly-solar', interval: 1, month: 2, day: 29, end: never }, { startDate: '2024-02-29' });
    expect(dates(e, '2024-01-01', '2028-12-31')).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29',
    ]);
  });

  it('giỗ hằng năm 29/8 âm lịch', () => {
    const e = make(
      { kind: 'yearly-lunar', interval: 1, lunarMonth: 8, lunarDay: 29, leapPolicy: 'regular', end: never },
      { startDate: '2025-01-01' },
    );
    const occ = getOccurrencesInRange(e, '2026-01-01', '2026-12-31');
    expect(occ.map((o) => o.date)).toEqual(['2026-10-09']);
    expect(occ[0].occurrenceKey).toBe('e1:L2026-8-29');
  });

  it('âm lịch: tháng nhuận chỉ xuất hiện khi tồn tại; policy both', () => {
    const base = { kind: 'yearly-lunar', interval: 1, lunarMonth: 2, lunarDay: 1, end: never } as const;
    const leap = make({ ...base, leapPolicy: 'leap' }, { startDate: '2022-01-01' });
    const both = make({ ...base, leapPolicy: 'both' }, { startDate: '2022-01-01' });
    expect(dates(leap, '2022-01-01', '2026-12-31')).toEqual(['2023-03-22']);
    expect(dates(both, '2023-01-01', '2023-12-31')).toEqual(['2023-02-20', '2023-03-22']);
  });

  it('exception skip và override', () => {
    const e = make(
      { kind: 'daily', interval: 1, end: never },
      {
        startDate: '2026-03-01',
        exceptions: [
          { occurrenceKey: 'e1:2026-03-02', action: 'skip' },
          { occurrenceKey: 'e1:2026-03-03', action: 'override', date: '2026-03-10', title: 'Dời lịch' },
        ],
      },
    );
    const occ = getOccurrencesInRange(e, '2026-03-01', '2026-03-11');
    expect(occ.map((o) => o.date)).not.toContain('2026-03-02');
    expect(occ.filter((o) => o.date === '2026-03-03')).toHaveLength(0);
    const moved = occ.filter((o) => o.date === '2026-03-10');
    expect(moved).toHaveLength(2); // lần gốc 10/3 và lần dời từ 3/3
    expect(moved.some((o) => o.title === 'Dời lịch')).toBe(true);
  });

  it('sự kiện nhiều ngày giao với khoảng xem', () => {
    const e = make({ kind: 'none' }, { startDate: '2026-05-01', endDate: '2026-05-03' });
    expect(dates(e, '2026-05-03', '2026-05-04')).toEqual(['2026-05-01']);
  });

  it('bỏ qua sự kiện đã hủy', () => {
    expect(dates(make({ kind: 'none' }, { status: 'cancelled' }), '2026-01-01', '2026-12-31')).toEqual([]);
  });

  it('nextOccurrence', () => {
    const e = make(
      { kind: 'yearly-lunar', interval: 1, lunarMonth: 8, lunarDay: 29, leapPolicy: 'regular', end: never },
      { startDate: '2020-01-01' },
    );
    expect(nextOccurrence(e, '2026-10-10')?.date).toBe('2027-09-29');
  });
});
