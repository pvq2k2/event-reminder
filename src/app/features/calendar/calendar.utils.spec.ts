import type { Occurrence } from '@core/domain/models';
import { describe, expect, it } from 'vitest';

import {
  buildDayReminders,
  buildMonthFor,
  buildWeek,
  isoWeekNumber,
  layoutTimedEvents,
  parseTimeMinutes,
  reminderLeadLabel,
  startOfWeekFor,
  timeRangeLabel,
  WEEK_END_HOUR,
  WEEK_HOURS,
  WEEK_START_HOUR,
} from './calendar.utils';

function occurrence(overrides: Partial<Occurrence> = {}): Occurrence {
  return {
    eventId: 'event-1',
    occurrenceKey: 'event-1@2026-10-05',
    date: '2026-10-05',
    endDate: '2026-10-05',
    startTime: '09:00',
    endTime: '10:00',
    isAllDay: false,
    title: 'Sự kiện',
    category: 'work',
    reminderOffsets: [],
    ...overrides,
  };
}

describe('startOfWeekFor', () => {
  it.each([
    ['2026-10-07', 1, '2026-10-05'],
    ['2026-10-07', 0, '2026-10-04'],
    ['2026-10-04', 1, '2026-09-28'],
    ['2026-10-04', 0, '2026-10-04'],
  ] as const)('%s với tuần bắt đầu %i -> %s', (iso, weekStartsOn, expected) => {
    expect(startOfWeekFor(iso, weekStartsOn)).toBe(expected);
  });
});

describe('buildMonthFor', () => {
  it('dựng lưới 6×7 và đánh dấu ngày ngoài tháng', () => {
    const month = buildMonthFor('2026-10-09', 1);

    expect(month.label).toBe('Tháng 10, 2026');
    expect(month.days).toHaveLength(42);
    expect(month.days[0]).toEqual({ date: '2026-09-28', day: 28, inMonth: false });
    expect(month.days.find((day) => day.date === '2026-10-01')?.inMonth).toBe(true);
    expect(month.days.filter((day) => day.inMonth)).toHaveLength(31);
    expect(month.days.at(-1)?.date).toBe('2026-11-08');
  });

  it('dựng lưới bắt đầu Chủ nhật', () => {
    const month = buildMonthFor('2026-10-09', 0);

    expect(month.days[0].date).toBe('2026-09-27');
    expect(month.days[1].date).toBe('2026-09-28');
  });
});

describe('reminderLeadLabel', () => {
  it.each([
    [0, 'Đúng giờ'],
    [30, 'Trước 30 phút'],
    [60, 'Trước 1 giờ'],
    [90, 'Trước 90 phút'],
    [1440, 'Trước 1 ngày'],
  ] as const)('%i phút -> %s', (offset, expected) => {
    expect(reminderLeadLabel(offset)).toBe(expected);
  });
});

describe('buildDayReminders', () => {
  it('chỉ giữ lời nhắc rơi đúng ngày và sắp xếp theo giờ', () => {
    const reminders = buildDayReminders(
      [
        occurrence({
          date: '2026-10-09',
          endDate: '2026-10-09',
          title: 'Họp',
          startTime: '09:00',
          reminderOffsets: [0, 30, 1440],
        }),
        occurrence({
          date: '2026-10-09',
          endDate: '2026-10-09',
          title: 'Giỗ',
          isAllDay: true,
          startTime: null,
          endTime: null,
          reminderOffsets: [0, 1440],
        }),
      ],
      '2026-10-09',
      '09:00',
    );

    expect(reminders.map((reminder) => [reminder.time, reminder.occurrence.title, reminder.label])).toEqual([
      ['08:30', 'Họp', 'Trước 30 phút'],
      ['09:00', 'Giỗ', 'Đúng giờ'],
      ['09:00', 'Họp', 'Đúng giờ'],
    ]);
  });

  it('bỏ qua sự kiện không có nhắc', () => {
    expect(buildDayReminders([occurrence()], '2026-10-09')).toEqual([]);
  });
});

describe('isoWeekNumber', () => {
  it.each([
    ['2026-01-01', 1],
    ['2026-10-05', 41],
    ['2024-12-30', 1],
    ['2027-01-01', 53],
  ] as const)('%s -> tuần %i', (iso, expected) => {
    expect(isoWeekNumber(iso)).toBe(expected);
  });
});

describe('buildWeek', () => {
  it('dựng tuần Thứ Hai với đủ 7 ngày và nhãn tuần', () => {
    const week = buildWeek('2026-10-07', 1);

    expect(week.start).toBe('2026-10-05');
    expect(week.end).toBe('2026-10-11');
    expect(week.number).toBe(41);
    expect(week.title).toBe('Tuần 41 · 05–11/10');
    expect(week.monthLabel).toBe('Tháng 10, 2026');
    expect(week.lunarLabel).toMatch(/âm$/);
    expect(week.meta).toBe(`${week.monthLabel} · ${week.lunarLabel}`);
    expect(week.days.map((day) => day.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(week.days.map((day) => day.day)).toEqual([5, 6, 7, 8, 9, 10, 11]);
  });

  it('dựng tuần Chủ nhật và hiển thị khoảng ngày', () => {
    const week = buildWeek('2026-10-07', 0);

    expect(week.start).toBe('2026-10-04');
    expect(week.end).toBe('2026-10-10');
    expect(week.number).toBe(41);
    expect(week.title).toBe('Tuần 41 · 04–10/10');
  });

  it('hiển thị đủ năm khi tuần vắt qua năm mới', () => {
    const week = buildWeek('2025-01-01', 1);

    expect(week.start).toBe('2024-12-30');
    expect(week.end).toBe('2025-01-05');
    expect(week.title).toBe('Tuần 1 · 30/12/2024 – 05/01/2025');
    expect(week.monthLabel).toBe('Tháng 12, 2024 – Tháng 1, 2025');
  });
});

describe('parseTimeMinutes', () => {
  it.each([
    ['00:00', 0],
    ['07:30', 450],
    ['24:00', 1440],
    [null, null],
    ['', null],
    ['7:30', null],
    ['24:01', null],
  ] as const)('%s -> %s', (time, expected) => {
    expect(parseTimeMinutes(time)).toBe(expected);
  });
});

describe('timeRangeLabel', () => {
  it('hiển thị cả ngày, giờ bắt đầu hoặc khoảng giờ', () => {
    expect(timeRangeLabel(null, null)).toBe('Cả ngày');
    expect(timeRangeLabel('09:00', null)).toBe('09:00');
    expect(timeRangeLabel('09:00', '10:30')).toBe('09:00–10:30');
  });
});

describe('WEEK_HOURS', () => {
  it('bao phủ đủ 24 giờ trong ngày', () => {
    expect(WEEK_START_HOUR).toBe(0);
    expect(WEEK_END_HOUR).toBe(24);
    expect(WEEK_HOURS).toHaveLength(24);
    expect(WEEK_HOURS[0]).toBe(0);
    expect(WEEK_HOURS.at(-1)).toBe(23);
  });
});

describe('layoutTimedEvents', () => {
  it('bỏ qua sự kiện cả ngày và giờ không hợp lệ', () => {
    expect(
      layoutTimedEvents([
        occurrence({ isAllDay: true }),
        occurrence({ startTime: null, endTime: null }),
        occurrence({ startTime: '25:00' }),
      ]),
    ).toEqual([]);
  });

  it('chia lane cho các sự kiện chồng nhau', () => {
    const blocks = layoutTimedEvents([
      occurrence({ title: 'A', startTime: '09:00', endTime: '10:00' }),
      occurrence({ title: 'B', startTime: '09:30', endTime: '10:30' }),
    ]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ width: 50, left: 0, time: '09:00–10:00' });
    expect(blocks[0].top).toBeCloseTo((540 / 1440) * 100);
    expect(blocks[0].height).toBeCloseTo((60 / 1440) * 100);
    expect(blocks[1]).toMatchObject({ width: 50, left: 50, time: '09:30–10:30' });
    expect(blocks[1].top).toBeCloseTo((570 / 1440) * 100);
  });

  it('dùng toàn chiều rộng cho các sự kiện không chồng nhau', () => {
    const blocks = layoutTimedEvents([
      occurrence({ title: 'A', startTime: '09:00', endTime: '10:00' }),
      occurrence({ title: 'B', startTime: '10:00', endTime: '11:00' }),
    ]);

    expect(blocks.map((block) => block.width)).toEqual([100, 100]);
    expect(blocks.map((block) => block.left)).toEqual([0, 0]);
  });

  it('hiển thị đủ 24 giờ và mặc định kéo dài 30 phút', () => {
    const blocks = layoutTimedEvents([
      occurrence({ title: 'Sớm', startTime: '06:00', endTime: '07:30' }),
      occurrence({ title: 'Muộn', startTime: '21:30', endTime: '23:00' }),
      occurrence({ title: 'Không kết thúc', startTime: '12:00', endTime: null }),
    ]);

    expect(blocks.find((block) => block.occurrence.title === 'Sớm')?.top).toBeCloseTo((360 / 1440) * 100);
    expect(blocks.find((block) => block.occurrence.title === 'Sớm')?.height).toBeCloseTo((90 / 1440) * 100);
    expect(blocks.find((block) => block.occurrence.title === 'Muộn')?.top).toBeCloseTo((1290 / 1440) * 100);
    expect(blocks.find((block) => block.occurrence.title === 'Muộn')?.height).toBeCloseTo((90 / 1440) * 100);
    expect(blocks.find((block) => block.occurrence.title === 'Không kết thúc')?.height).toBeCloseTo((30 / 1440) * 100);
  });
});
