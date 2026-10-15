import { Injectable, inject } from '@angular/core';
import type { AppEvent } from '../domain/models';
import { ReminderReconciler } from '../notifications/reminder-reconciler';
import { EventRepository, type NewEvent } from './event.repository';

/** Use case: phối hợp repository và lịch nhắc. UI gọi service này thay vì repository khi có ghi dữ liệu. */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly repo = inject(EventRepository);
  private readonly reconciler = inject(ReminderReconciler);

  async create(input: NewEvent): Promise<AppEvent> {
    const e = await this.repo.create(input);
    await this.reconciler.reconcile();
    return e;
  }
  async update(id: string, patch: Partial<NewEvent>): Promise<AppEvent> {
    const e = await this.repo.update(id, patch);
    await this.reconciler.reconcile();
    return e;
  }
  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
    await this.reconciler.reconcile();
  }
}
