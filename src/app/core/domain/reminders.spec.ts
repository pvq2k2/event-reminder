import { describe, expect, it } from 'vitest';
import { epochMsToVnLocal, vnLocalToEpochMs } from './date';
import type { AppEvent, Occurrence } from './models';
import { buildReminderPlans, computeFireAt } from './reminders';

const occ = (over: Partial<Occurrence> = {}): Occurrence => ({
  eventId: 'e',
  occurrenceKey: 'e:2026-10-09',
  date: '2026-10-09',
  endDate: '2026-10-09',
  startTime: '19:00',
  endTime: null,
  isAllDay: false,
  title: 'Giỗ',
  category: 'memorial',
  reminderOffsets: [],
  ...over,
});
const opts = { allDayReminderTime: '09:00' };

describe('computeFireAt', () => {
  it('trừ offset từ giờ bắt đầu', () => {
    expect(epochMsToVnLocal(computeFireAt(occ(), 30, opts))).toEqual({ date: '2026-10-09', time: '18:30' });
    expect(epochMsToVnLocal(computeFireAt(occ(), 1440, opts))).toEqual({ date: '2026-10-08', time: '19:00' });
  });
  it('cả ngày dùng giờ nhắc mặc định, không trừ phút từ 00:00', () => {
    const o = occ({ isAllDay: true, startTime: null });
    expect(epochMsToVnLocal(computeFireAt(o, 30, opts))).toEqual({ date: '2026-10-09', time: '09:00' });
    expect(epochMsToVnLocal(computeFireAt(o, 1440, opts))).toEqual({ date: '2026-10-08', time: '09:00' });
  });
});

describe('buildReminderPlans', () => {
  const event: AppEvent = {
    id: 'e',
    title: 'Giỗ ông nội',
    startDate: '2026-10-09',
    startTime: '19:00',
    timezone: 'Asia/Ho_Chi_Minh',
    isAllDay: false,
    calendarSystem: 'lunar',
    category: 'memorial',
    status: 'active',
    rule: { kind: 'none' },
    reminders: [
      { id: 'r1', offsetMinutes: 30, enabled: true },
      { id: 'r2', offsetMinutes: 1440, enabled: true },
      { id: 'r3', offsetMinutes: 60, enabled: false },
    ],
    exceptions: [],
    contactIds: [],
    createdAt: '',
    updatedAt: '',
  };
  it('chỉ lấy mốc bật, trong cửa sổ, id ổn định', () => {
    const now = vnLocalToEpochMs('2026-10-08', '12:00');
    const plans = buildReminderPlans([event], now, 7, opts, '2026-10-08');
    expect(plans.map((p) => p.id)).toEqual(['e:single#r2', 'e:single#r1']);
    expect(plans[1].body).toContain('30 phút nữa');
  });
  it('bỏ mốc đã qua', () => {
    const now = vnLocalToEpochMs('2026-10-09', '18:45');
    expect(buildReminderPlans([event], now, 7, opts, '2026-10-09')).toEqual([]);
  });
});
