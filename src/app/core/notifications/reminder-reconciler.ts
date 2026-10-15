import { Injectable, inject } from '@angular/core';
import { APP_DB } from '../data/db';
import { Clock } from '../data/clock';
import { EventRepository } from '../data/event.repository';
import { SettingsRepository } from '../data/settings.repository';
import { buildReminderPlans } from '../domain/reminders';
import { InAppReminderScheduler } from './in-app-reminder-scheduler';

const HORIZON_DAYS = 14;

/**
 * Đối soát: SQLite/IndexedDB và hệ thống nhắc là hai nơi khác nhau nên không thể nguyên tử.
 * Vì vậy mọi thay đổi gọi lại reconcile() (idempotent) và nó cũng chạy khi mở app, khi tab hiện lại, mỗi giờ.
 */
@Injectable({ providedIn: 'root' })
export class ReminderReconciler {
  private readonly db = inject(APP_DB);
  private readonly clock = inject(Clock);
  private readonly events = inject(EventRepository);
  private readonly settings = inject(SettingsRepository);
  private readonly scheduler = inject(InAppReminderScheduler);
  private running: Promise<void> | null = null;

  start(): void {
    void this.reconcile();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void this.reconcile();
    });
    setInterval(() => void this.reconcile(), 60 * 60 * 1000);
  }

  reconcile(): Promise<void> {
    this.running ??= this.run().finally(() => (this.running = null));
    return this.running;
  }

  private async run(): Promise<void> {
    const s = await this.settings.get();
    if (!s.notificationsEnabled) {
      this.scheduler.cancelAll();
      return;
    }
    const plans = buildReminderPlans(
      await this.events.listActive(),
      this.clock.now(),
      HORIZON_DAYS,
      s,
      this.clock.todayIso(),
    );
    const { scheduled } = await this.scheduler.apply(plans);
    const done = new Set(scheduled);
    const now = this.clock.now();
    await this.db.transaction('rw', this.db.notificationSchedules, async () => {
      await this.db.notificationSchedules.clear();
      await this.db.notificationSchedules.bulkAdd(
        plans.map((p) => ({
          id: p.id,
          eventId: p.eventId,
          occurrenceKey: p.occurrenceKey,
          reminderId: p.reminderId,
          scheduledAt: p.fireAt,
          status: done.has(p.id) ? 'scheduled' : 'failed',
          updatedAt: now,
        })),
      );
    });
  }
}
