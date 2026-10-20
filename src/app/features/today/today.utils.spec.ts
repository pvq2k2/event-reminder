import { describe, expect, it } from 'vitest';
import type { Occurrence } from '@core/domain/models';
import { vnLocalToEpochMs } from '@core/domain/date';
import { buildMonthGrid, buildWeek, pickNext, todayQueryRange } from './today.utils';

const occ = (over: Partial<Occurrence> = {}): Occurrence => ({
  eventId: 'e1',
  occurrenceKey: 'e1:single',
  date: '2026-10-09',
  endDate: '2026-10-09',
  startTime: '19:00',
  endTime: null,
  isAllDay: false,
  title: 'Giỗ ông nội',
  category: 'memorial',
  reminderOffsets: [30],
  ...over,
});

describe('buildWeek', () => {
  it('bắt đầu Thứ Hai hoặc Chủ nhật theo cài đặt', () => {
    expect(buildWeek('2026-10-09', 1).map((d) => d.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(
      buildWeek('2026-10-09', 0)
        .map((d) => d.date)
        .slice(0, 2),
    ).toEqual(['2026-10-04', '2026-10-05']);
    expect(buildWeek('2026-10-09', 1).find((d) => d.isToday)?.day).toBe(9);
  });
});

describe('buildMonthGrid', () => {
  it('phủ đủ 6 tuần và đánh dấu ngày ngoài tháng', () => {
    const days = buildMonthGrid('2026-10-09', 1);
    expect(days).toHaveLength(42);
    expect(days[0].date).toBe('2026-09-28');
    expect(days[41].date).toBe('2026-11-08');
    expect(days.find((d) => d.date === '2026-09-28')?.inMonth).toBe(false);
    expect(days.find((d) => d.date === '2026-10-09')?.isToday).toBe(true);
  });
});

describe('todayQueryRange', () => {
  it('lấy trọn lưới tháng và 7 ngày tới', () => {
    expect(todayQueryRange('2026-10-09', 1)).toEqual({ from: '2026-09-28', to: '2026-11-08' });
  });
});

describe('pickNext', () => {
  const now = vnLocalToEpochMs('2026-10-09', '08:00');

  it('chọn sự kiện có giờ gần nhất chưa bắt đầu', () => {
    const next = pickNext(
      [
        occ({ title: 'Đã qua', startTime: '07:00' }),
        occ({ title: 'Sắp tới', occurrenceKey: 'e2:single', startTime: '09:00' }),
      ],
      now,
    );
    expect(next?.title).toBe('Sắp tới');
  });

  it('quay về sự kiện cả ngày khi không còn sự kiện có giờ', () => {
    const next = pickNext([occ({ title: 'Cả ngày', isAllDay: true, startTime: null })], now);
    expect(next?.title).toBe('Cả ngày');
  });
});
