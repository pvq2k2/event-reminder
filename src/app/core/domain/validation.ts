import type { AppEvent, RecurrenceRule } from './models';

export type EventDraft = Pick<
  AppEvent,
  'title' | 'startDate' | 'startTime' | 'endDate' | 'endTime' | 'isAllDay' | 'rule'
>;
export type ValidationErrors = Partial<Record<'title' | 'startDate' | 'endDate' | 'endTime' | 'rule', string>>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function ruleError(rule: RecurrenceRule): string | null {
  if (rule.kind === 'none') return null;
  if (!Number.isInteger(rule.interval) || rule.interval < 1) return 'Khoảng lặp phải từ 1 trở lên';
  if (rule.end.type === 'count' && (!Number.isInteger(rule.end.count) || rule.end.count < 1))
    return 'Số lần lặp phải từ 1 trở lên';
  if (rule.kind === 'weekly' && (!rule.weekdays.length || rule.weekdays.some((d) => d < 0 || d > 6)))
    return 'Chọn ít nhất một thứ trong tuần';
  if (rule.kind === 'monthly' && (rule.monthDay < 1 || rule.monthDay > 31)) return 'Ngày trong tháng không hợp lệ';
  if (rule.kind === 'yearly-solar' && (rule.month < 1 || rule.month > 12 || rule.day < 1 || rule.day > 31))
    return 'Ngày/tháng không hợp lệ';
  if (
    rule.kind === 'yearly-lunar' &&
    (rule.lunarMonth < 1 || rule.lunarMonth > 12 || rule.lunarDay < 1 || rule.lunarDay > 30)
  )
    return 'Ngày/tháng âm không hợp lệ';
  return null;
}

export function validateEventDraft(d: EventDraft): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!d.title.trim()) errors.title = 'Tiêu đề không được để trống';
  else if (d.title.length > 200) errors.title = 'Tiêu đề tối đa 200 ký tự';
  if (!ISO.test(d.startDate)) errors.startDate = 'Ngày bắt đầu không hợp lệ';
  if (d.endDate && (!ISO.test(d.endDate) || d.endDate < d.startDate))
    errors.endDate = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu';
  if (!d.isAllDay) {
    if (!d.startTime || !TIME.test(d.startTime)) errors.startDate ??= 'Cần giờ bắt đầu cho sự kiện không cả ngày';
    const sameDay = !d.endDate || d.endDate === d.startDate;
    if (d.endTime && (!TIME.test(d.endTime) || (sameDay && d.startTime && d.endTime <= d.startTime))) {
      errors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
    }
  }
  const re = ruleError(d.rule);
  if (re) errors.rule = re;
  return errors;
}
