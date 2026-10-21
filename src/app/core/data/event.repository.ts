import { inject, Injectable } from '@angular/core';

import type { ISODate } from '../domain/date';
import type { AppEvent, Occurrence } from '../domain/models';
import { compareOccurrences, getOccurrencesInRange } from '../domain/recurrence';
import { type EventDraft, validateEventDraft } from '../domain/validation';
import { APP_DB } from './db';

export type NewEvent = Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'timezone'> &
  Partial<Pick<AppEvent, 'status' | 'timezone'>>;

export class EventValidationError extends Error {
  constructor(readonly errors: Record<string, string>) {
    super('Dữ liệu sự kiện không hợp lệ');
  }
}

@Injectable({ providedIn: 'root' })
export class EventRepository {
  private readonly db = inject(APP_DB);

  private check(draft: EventDraft): void {
    const errors = validateEventDraft(draft);
    if (Object.keys(errors).length) throw new EventValidationError(errors);
  }

  async create(input: NewEvent): Promise<AppEvent> {
    this.check(input);
    const now = new Date().toISOString();
    const event: AppEvent = {
      ...input,
      id: crypto.randomUUID(),
      status: input.status ?? 'active',
      timezone: input.timezone ?? 'Asia/Ho_Chi_Minh',
      createdAt: now,
      updatedAt: now,
    };
    await this.db.events.add(event);
    return event;
  }

  async update(id: string, patch: Partial<NewEvent>): Promise<AppEvent> {
    return this.db.transaction('rw', this.db.events, async () => {
      const current = await this.db.events.get(id);
      if (!current) throw new Error(`Không tìm thấy sự kiện ${id}`);
      const next: AppEvent = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
      this.check(next);
      await this.db.events.put(next);
      return next;
    });
  }

  /** Xóa sự kiện và lịch nhắc đã quản lý của nó trong một transaction. */
  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.events, this.db.notificationSchedules, async () => {
      await this.db.events.delete(id);
      await this.db.notificationSchedules.where('eventId').equals(id).delete();
    });
  }

  get(id: string): Promise<AppEvent | undefined> {
    return this.db.events.get(id);
  }
  listActive(): Promise<AppEvent[]> {
    return this.db.events.where('status').equals('active').toArray();
  }

  /** Truy vấn theo khoảng ngày (không truy vấn từng ô lịch). Sự kiện lặp được sinh lazy từ quy tắc. */
  async occurrencesInRange(from: ISODate, to: ISODate): Promise<Occurrence[]> {
    const events = await this.db.events
      .where('startDate')
      .belowOrEqual(to)
      .filter((e) => e.status !== 'cancelled')
      .toArray();
    return events.flatMap((e) => getOccurrencesInRange(e, from, to)).sort(compareOccurrences);
  }
}
