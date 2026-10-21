import { addDays, formatIso, type ISODate, parseIso, startOfWeekMonday, vnLocalToEpochMs } from '@core/domain/date';
import type { Occurrence } from '@core/domain/models';
import { weekdayShortVi } from '@shared/utils';

export interface CalendarCell {
  date: ISODate;
  day: number;
  isToday: boolean;
}

export interface WeekDay extends CalendarCell {
  label: string;
}

export interface MonthDay extends CalendarCell {
  inMonth: boolean;
}

/** Tuần bắt đầu Thứ Hai (1) hoặc Chủ nhật (0), theo cài đặt. */
export function startOfWeekFor(iso: ISODate, weekStartsOn: 0 | 1): ISODate {
  const monday = startOfWeekMonday(iso);
  return weekStartsOn === 1 ? monday : addDays(monday, -1);
}

export function buildWeek(today: ISODate, weekStartsOn: 0 | 1): WeekDay[] {
  const start = startOfWeekFor(today, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, day: parseIso(date)[2], isToday: date === today, label: weekdayShortVi(date) };
  });
}

/** Lưới tháng 6×7 phủ trọn tháng chứa `today`. */
export function buildMonthGrid(today: ISODate, weekStartsOn: 0 | 1): MonthDay[] {
  const [year, month] = parseIso(today);
  const firstOfMonth = formatIso(year, month, 1);
  const start = startOfWeekFor(firstOfMonth, weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    const [cy, cm, day] = parseIso(date);
    return { date, day, inMonth: cy === year && cm === month, isToday: date === today };
  });
}

/** Khoảng ngày cần tải: phủ lưới tháng và 7 ngày tới, không truy vấn từng ô. */
export function todayQueryRange(today: ISODate, weekStartsOn: 0 | 1): { from: ISODate; to: ISODate } {
  const monthDays = buildMonthGrid(today, weekStartsOn);
  const from = monthDays[0].date < today ? monthDays[0].date : today;
  const weekEnd = addDays(today, 7);
  const to = monthDays[41].date > weekEnd ? monthDays[41].date : weekEnd;
  return { from, to };
}

/** Sự kiện có giờ gần nhất chưa bắt đầu; nếu không có thì lần cả ngày gần nhất. */
export function pickNext(occurrences: Occurrence[], nowMs: number): Occurrence | null {
  const timed = occurrences
    .filter((o): o is Occurrence & { startTime: string } => !o.isAllDay && o.startTime !== null)
    .map((occurrence) => ({ occurrence, at: vnLocalToEpochMs(occurrence.date, occurrence.startTime) }))
    .filter((x) => x.at >= nowMs)
    .sort((a, b) => a.at - b.at);
  if (timed.length) return timed[0].occurrence;
  return occurrences.find((o) => o.isAllDay) ?? null;
}
