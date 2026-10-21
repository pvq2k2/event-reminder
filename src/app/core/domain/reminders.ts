import { addDays, type ISODate, vnLocalToEpochMs } from './date';
import type { AppEvent, Occurrence } from './models';
import { getOccurrencesInRange } from './recurrence';

export interface ReminderPlan {
  /** Ổn định theo (occurrenceKey, reminderId) để chống lên lịch trùng. */
  id: string;
  eventId: string;
  occurrenceKey: string;
  reminderId: string;
  title: string;
  body: string;
  fireAt: number;
  occurrenceDate: ISODate;
}

export interface ReminderOptions {
  allDayReminderTime: string; // HH:mm
}

/** Giờ nhắc (epoch ms). Cả ngày: bội số 1440 = số ngày trước; không trừ phút từ 00:00. */
export function computeFireAt(occ: Occurrence, offsetMinutes: number, opts: ReminderOptions): number {
  if (occ.isAllDay || !occ.startTime) {
    const daysBefore = Math.floor(offsetMinutes / 1440);
    return vnLocalToEpochMs(addDays(occ.date, -daysBefore), opts.allDayReminderTime);
  }
  return vnLocalToEpochMs(occ.date, occ.startTime) - offsetMinutes * 60_000;
}

const body = (occ: Occurrence, offset: number) => {
  const when = occ.isAllDay ? 'cả ngày' : `lúc ${occ.startTime}`;
  const lead =
    offset === 0 ? 'Bây giờ' : offset >= 1440 ? `${Math.floor(offset / 1440)} ngày nữa` : `${offset} phút nữa`;
  return `${lead} · ${when}`;
};

/** Các lời nhắc cần có trong cửa sổ [nowMs, nowMs + horizon]. Hàm thuần để reconcile và test. */
export function buildReminderPlans(
  events: AppEvent[],
  nowMs: number,
  horizonDays: number,
  opts: ReminderOptions,
  todayIso: ISODate,
): ReminderPlan[] {
  const plans: ReminderPlan[] = [];
  const to = addDays(todayIso, horizonDays + 7); // dư vài ngày vì nhắc trước có thể rơi vào cửa sổ
  const horizonMs = nowMs + horizonDays * 86_400_000;
  for (const event of events) {
    if (event.status !== 'active') continue;
    const enabled = event.reminders.filter((r) => r.enabled);
    if (!enabled.length) continue;
    for (const occ of getOccurrencesInRange(event, todayIso, to)) {
      for (const r of enabled) {
        const fireAt = computeFireAt(occ, r.offsetMinutes, opts);
        if (fireAt < nowMs || fireAt > horizonMs) continue;
        plans.push({
          id: `${occ.occurrenceKey}#${r.id}`,
          eventId: event.id,
          occurrenceKey: occ.occurrenceKey,
          reminderId: r.id,
          title: occ.title,
          body: body(occ, r.offsetMinutes),
          fireAt,
          occurrenceDate: occ.date,
        });
      }
    }
  }
  return plans.sort((a, b) => a.fireAt - b.fireAt);
}
