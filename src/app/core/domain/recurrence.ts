import { addDays, daysInMonth, diffDays, formatIso, type ISODate, parseIso, startOfWeekMonday } from './date';
import { gregorianToLunar, lunarToGregorian } from './lunar';
import type { AppEvent, EndCondition, EventException, Occurrence, RecurrenceRule } from './models';

const MAX_ITERATIONS = 20_000;

interface Candidate {
  date: ISODate;
  key: string;
}

/** Sinh ứng viên theo thứ tự tăng dần, không bao giờ sinh vô hạn trước: generator lazy. */
function* candidates(eventId: string, startDate: ISODate, rule: RecurrenceRule): Generator<Candidate> {
  switch (rule.kind) {
    case 'none':
      yield { date: startDate, key: `${eventId}:single` };
      return;
    case 'daily':
      for (let n = 0; n < MAX_ITERATIONS; n++) {
        const date = addDays(startDate, n * rule.interval);
        yield { date, key: `${eventId}:${date}` };
      }
      return;
    case 'weekly': {
      const anchor = startOfWeekMonday(startDate);
      const days = [...new Set(rule.weekdays)].map((w) => (w + 6) % 7).sort((a, b) => a - b); // thứ Hai = 0
      for (let w = 0; w < MAX_ITERATIONS; w++) {
        for (const d of days) {
          const date = addDays(anchor, w * 7 * rule.interval + d);
          if (date >= startDate) yield { date, key: `${eventId}:${date}` };
        }
      }
      return;
    }
    case 'monthly': {
      const [sy, sm] = parseIso(startDate);
      for (let n = 0; n < MAX_ITERATIONS; n++) {
        const idx = sm - 1 + n * rule.interval;
        const y = sy + Math.floor(idx / 12);
        const m = (idx % 12) + 1;
        const dim = daysInMonth(y, m);
        if (rule.monthDay > dim && rule.missingDay === 'skip') continue;
        const date = formatIso(y, m, Math.min(rule.monthDay, dim));
        if (date >= startDate) yield { date, key: `${eventId}:${date}` };
      }
      return;
    }
    case 'yearly-solar': {
      const [sy] = parseIso(startDate);
      for (let n = 0; n < MAX_ITERATIONS; n++) {
        const y = sy + n * rule.interval;
        const date = formatIso(y, rule.month, Math.min(rule.day, daysInMonth(y, rule.month)));
        if (date >= startDate) yield { date, key: `${eventId}:${date}` };
      }
      return;
    }
    case 'yearly-lunar': {
      const startYear = gregorianToLunar(startDate).year;
      const variants = rule.leapPolicy === 'both' ? [false, true] : [rule.leapPolicy === 'leap'];
      for (let n = 0; n < 2_000; n++) {
        const year = startYear + n * rule.interval;
        for (const isLeapMonth of variants) {
          const date = lunarToGregorian({ day: rule.lunarDay, month: rule.lunarMonth, year, isLeapMonth });
          if (date && date >= startDate) {
            yield { date, key: `${eventId}:L${year}-${rule.lunarMonth}${isLeapMonth ? 'N' : ''}-${rule.lunarDay}` };
          }
        }
      }
      return;
    }
  }
}

function limitOf(end: EndCondition | undefined): { until?: ISODate; count?: number } {
  if (!end || end.type === 'never') return {};
  return end.type === 'until' ? { until: end.date } : { count: end.count };
}

function toOccurrence(event: AppEvent, c: Candidate, durationDays: number): Occurrence {
  return {
    eventId: event.id,
    occurrenceKey: c.key,
    date: c.date,
    endDate: addDays(c.date, durationDays),
    startTime: event.startTime,
    endTime: event.endTime ?? null,
    isAllDay: event.isAllDay,
    title: event.title,
    category: event.category,
    location: event.location,
    reminderOffsets: event.reminders.filter((r) => r.enabled).map((r) => r.offsetMinutes),
  };
}

function applyOverride(base: Occurrence, ex: Extract<EventException, { action: 'override' }>): Occurrence {
  const span = diffDays(base.endDate, base.date);
  const date = ex.date ?? base.date;
  return {
    ...base,
    date,
    endDate: addDays(date, span),
    startTime: ex.startTime === undefined ? base.startTime : ex.startTime,
    endTime: ex.endTime === undefined ? base.endTime : ex.endTime,
    title: ex.title ?? base.title,
  };
}

export const compareOccurrences = (a: Occurrence, b: Occurrence): number =>
  a.date.localeCompare(b.date) ||
  (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
  a.title.localeCompare(b.title);

/** Các lần diễn ra của một sự kiện trong [rangeStart, rangeEnd] (bao gồm hai đầu). */
export function getOccurrencesInRange(event: AppEvent, rangeStart: ISODate, rangeEnd: ISODate): Occurrence[] {
  if (event.status === 'cancelled' || rangeStart > rangeEnd) return [];
  const durationDays = event.endDate ? Math.max(0, diffDays(event.endDate, event.startDate)) : 0;
  const { until, count } = limitOf('end' in event.rule ? event.rule.end : undefined);
  const exceptions = new Map(event.exceptions.map((e) => [e.occurrenceKey, e]));
  const result: Occurrence[] = [];

  let produced = 0;
  for (const c of candidates(event.id, event.startDate, event.rule)) {
    if (c.date > rangeEnd) break;
    if (until && c.date > until) break;
    if (count !== undefined && produced >= count) break;
    produced++;
    if (exceptions.has(c.key)) continue; // xử lý riêng bên dưới
    if (addDays(c.date, durationDays) >= rangeStart) result.push(toOccurrence(event, c, durationDays));
  }

  // Ngoại lệ "override" có thể dời một lần diễn ra vào hoặc ra khỏi khoảng đang xem.
  for (const ex of exceptions.values()) {
    if (ex.action !== 'override') continue;
    const base = findCandidate(event, ex.occurrenceKey, until, count);
    if (!base) continue;
    const occ = applyOverride(toOccurrence(event, base, durationDays), ex);
    if (occ.date <= rangeEnd && occ.endDate >= rangeStart) result.push(occ);
  }
  return result.sort(compareOccurrences);
}

function findCandidate(event: AppEvent, key: string, until?: ISODate, count?: number): Candidate | null {
  let produced = 0;
  for (const c of candidates(event.id, event.startDate, event.rule)) {
    if (until && c.date > until) return null;
    if (count !== undefined && produced >= count) return null;
    produced++;
    if (c.key === key) return c;
    if (c.key > key && !key.includes(':L')) {
      // khóa dương lịch là ISO nên so sánh được; khóa âm lịch phải duyệt hết (đã giới hạn bởi generator)
      if (c.date > key.slice(-10)) return null;
    }
  }
  return null;
}

/** Lần diễn ra đầu tiên từ `from` trở đi trong `horizonDays` ngày. */
export function nextOccurrence(event: AppEvent, from: ISODate, horizonDays = 800): Occurrence | null {
  return getOccurrencesInRange(event, from, addDays(from, horizonDays))[0] ?? null;
}
