import {
  addDays,
  diffDays,
  epochMsToVnLocal,
  formatIso,
  type ISODate,
  parseIso,
  startOfWeekMonday,
  weekday,
} from '@core/domain/date';
import { formatLunar, gregorianToLunar } from '@core/domain/lunar';
import type { Occurrence } from '@core/domain/models';
import { computeFireAt } from '@core/domain/reminders';

export type CalendarView = 'month' | 'week' | 'day';

export interface MonthDayCell {
  date: ISODate;
  day: number;
  inMonth: boolean;
}

export interface MonthModel {
  year: number;
  month: number;
  label: string;
  days: MonthDayCell[];
}

export interface DayReminder {
  key: string;
  occurrence: Occurrence;
  time: string;
  label: string;
}

export interface WeekDayCell {
  date: ISODate;
  day: number;
  lunarLabel: string;
}

export interface WeekModel {
  start: ISODate;
  end: ISODate;
  number: number;
  title: string;
  monthLabel: string;
  lunarLabel: string;
  meta: string;
  days: WeekDayCell[];
}

export interface TimedEventBlock {
  occurrence: Occurrence;
  top: number;
  height: number;
  left: number;
  width: number;
  time: string;
}

export const WEEK_START_HOUR = 0;
export const WEEK_END_HOUR = 24;
export const WEEK_HOURS = Array.from({ length: WEEK_END_HOUR - WEEK_START_HOUR }, (_, i) => WEEK_START_HOUR + i);

const MINUTES_IN_DAY = 24 * 60;
const RANGE_START = WEEK_START_HOUR * 60;
const RANGE_END = WEEK_END_HOUR * 60;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Tuần bắt đầu Thứ Hai (1) hoặc Chủ nhật (0), theo cài đặt. */
export function startOfWeekFor(iso: ISODate, weekStartsOn: 0 | 1): ISODate {
  return addDays(iso, -((weekday(iso) - weekStartsOn + 7) % 7));
}

export function buildMonthFor(anchor: ISODate, weekStartsOn: 0 | 1): MonthModel {
  const [year, month] = parseIso(anchor);
  const start = startOfWeekFor(formatIso(year, month, 1), weekStartsOn);
  const days = Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    const [cy, cm, day] = parseIso(date);
    return { date, day, inMonth: cy === year && cm === month };
  });
  return { year, month, label: `Tháng ${month}, ${year}`, days };
}

export function reminderLeadLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'Đúng giờ';
  if (offsetMinutes % 1440 === 0) return `Trước ${offsetMinutes / 1440} ngày`;
  if (offsetMinutes % 60 === 0) return `Trước ${offsetMinutes / 60} giờ`;
  return `Trước ${offsetMinutes} phút`;
}

export function buildDayReminders(
  items: readonly Occurrence[],
  date: ISODate,
  allDayReminderTime = '09:00',
): DayReminder[] {
  const reminders = items.flatMap((occurrence) =>
    occurrence.reminderOffsets.flatMap((offset, index) => {
      const local = epochMsToVnLocal(computeFireAt(occurrence, offset, { allDayReminderTime }));
      if (local.date !== date) return [];
      return [
        {
          key: `${occurrence.occurrenceKey}#${offset}#${index}`,
          occurrence,
          time: local.time,
          label: reminderLeadLabel(offset),
        },
      ];
    }),
  );
  return reminders.sort((a, b) => a.time.localeCompare(b.time) || a.occurrence.title.localeCompare(b.occurrence.title));
}

/** Số tuần ISO 8601 của ngày, tính theo Thứ Năm của tuần chứa ngày đó. */
export function isoWeekNumber(iso: ISODate): number {
  const monday = startOfWeekMonday(iso);
  const thursday = addDays(monday, 3);
  const [year] = parseIso(thursday);
  const firstMonday = startOfWeekMonday(formatIso(year, 1, 4));
  return Math.floor(diffDays(thursday, firstMonday) / 7) + 1;
}

function formatWeekRange(start: ISODate, end: ISODate): string {
  const [sy, sm, sd] = parseIso(start);
  const [ey, em, ed] = parseIso(end);
  if (sy !== ey) return `${pad2(sd)}/${pad2(sm)}/${sy} – ${pad2(ed)}/${pad2(em)}/${ey}`;
  if (sm !== em) return `${pad2(sd)}/${pad2(sm)} – ${pad2(ed)}/${pad2(em)}`;
  return `${pad2(sd)}–${pad2(ed)}/${pad2(sm)}`;
}

function formatMonthSpan(start: ISODate, end: ISODate): string {
  const [sy, sm] = parseIso(start);
  const [ey, em] = parseIso(end);
  if (sy !== ey) return `Tháng ${sm}, ${sy} – Tháng ${em}, ${ey}`;
  if (sm !== em) return `Tháng ${sm} – ${em}, ${sy}`;
  return `Tháng ${sm}, ${sy}`;
}

export function buildWeek(anchor: ISODate, weekStartsOn: 0 | 1): WeekModel {
  const start = startOfWeekFor(anchor, weekStartsOn);
  const end = addDays(start, 6);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const lunar = gregorianToLunar(date);
    return {
      date,
      day: parseIso(date)[2],
      lunarLabel: lunar.day === 1 ? `${lunar.day}/${lunar.month}` : String(lunar.day),
    };
  });
  const lunarStart = formatLunar(gregorianToLunar(start));
  const lunarEnd = formatLunar(gregorianToLunar(end));
  const monthLabel = formatMonthSpan(start, end);
  const lunarLabel = `${lunarStart} – ${lunarEnd} âm`;
  return {
    start,
    end,
    number: isoWeekNumber(anchor),
    title: `Tuần ${isoWeekNumber(anchor)} · ${formatWeekRange(start, end)}`,
    monthLabel,
    lunarLabel,
    meta: `${monthLabel} · ${lunarLabel}`,
    days,
  };
}

export function parseTimeMinutes(time: string | null): number | null {
  if (!time) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes <= MINUTES_IN_DAY ? minutes : null;
}

export function timeRangeLabel(startTime: string | null, endTime: string | null): string {
  if (!startTime) return 'Cả ngày';
  return endTime ? `${startTime}–${endTime}` : startTime;
}

/**
 * Xếp các sự kiện có giờ trong một ngày thành lane để không đè nhau.
 * Trả toạ độ theo % chiều cao/chiều ngang của lưới tuần.
 */
export function layoutTimedEvents(items: readonly Occurrence[]): TimedEventBlock[] {
  const timed = items
    .flatMap((occurrence) => {
      if (occurrence.isAllDay || !occurrence.startTime) return [];
      const start = parseTimeMinutes(occurrence.startTime);
      if (start === null) return [];
      const rawEnd = parseTimeMinutes(occurrence.endTime);
      const end = rawEnd !== null && rawEnd > start ? rawEnd : start + 30;
      const top = Math.max(start, RANGE_START);
      const bottom = Math.min(end, RANGE_END);
      if (bottom <= top) return [];
      return [{ occurrence, start, end: bottom, top }];
    })
    .sort((a, b) => a.start - b.start || a.occurrence.title.localeCompare(b.occurrence.title));

  const result: TimedEventBlock[] = [];
  let cluster: { item: (typeof timed)[number]; lane: number }[] = [];
  let clusterEnd = -1;
  let lanesEnd: number[] = [];
  let laneCount = 1;

  const commit = (): void => {
    const width = 100 / laneCount;
    for (const entry of cluster) {
      const { occurrence, top } = entry.item;
      result.push({
        occurrence,
        top: ((top - RANGE_START) / (RANGE_END - RANGE_START)) * 100,
        height: ((entry.item.end - top) / (RANGE_END - RANGE_START)) * 100,
        left: entry.lane * width,
        width,
        time: timeRangeLabel(occurrence.startTime, occurrence.endTime),
      });
    }
    cluster = [];
    lanesEnd = [];
    clusterEnd = -1;
    laneCount = 1;
  };

  for (const item of timed) {
    if (item.start >= clusterEnd) commit();
    let lane = lanesEnd.findIndex((end) => end <= item.start);
    if (lane === -1) lane = lanesEnd.length;
    lanesEnd[lane] = item.end;
    laneCount = Math.max(laneCount, lanesEnd.length);
    cluster.push({ item, lane });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  commit();

  return result;
}
