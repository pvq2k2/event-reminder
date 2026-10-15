import { describe, expect, it } from 'vitest';
import { type EventDraft, validateEventDraft } from './validation';

const ok: EventDraft = {
  title: 'Giỗ',
  startDate: '2026-10-09',
  startTime: '19:00',
  endTime: '21:00',
  isAllDay: false,
  rule: { kind: 'none' },
};

describe('validateEventDraft', () => {
  it('hợp lệ', () => expect(validateEventDraft(ok)).toEqual({}));
  it('tiêu đề rỗng', () => expect(validateEventDraft({ ...ok, title: '  ' }).title).toBeDefined());
  it('giờ kết thúc trước giờ bắt đầu', () =>
    expect(validateEventDraft({ ...ok, endTime: '18:00' }).endTime).toBeDefined());
  it('cho phép qua nửa đêm khi khác ngày', () =>
    expect(validateEventDraft({ ...ok, endDate: '2026-10-10', endTime: '01:00' })).toEqual({}));
  it('ngày kết thúc trước ngày bắt đầu', () =>
    expect(validateEventDraft({ ...ok, endDate: '2026-10-01' }).endDate).toBeDefined());
  it('weekly thiếu thứ', () =>
    expect(
      validateEventDraft({ ...ok, rule: { kind: 'weekly', interval: 1, weekdays: [], end: { type: 'never' } } }).rule,
    ).toBeDefined());
  it('sự kiện cả ngày không cần giờ', () =>
    expect(validateEventDraft({ ...ok, isAllDay: true, startTime: null, endTime: null })).toEqual({}));
});
