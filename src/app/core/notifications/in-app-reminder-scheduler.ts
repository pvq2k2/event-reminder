import { Injectable, inject, signal } from '@angular/core';
import type { ReminderPlan } from '../domain/reminders';
import { NotificationPermissionService } from './notification-permission.service';
import type { ReminderScheduler } from './reminder-scheduler';

const MAX_TIMEOUT = 2 ** 31 - 1; // ~24,8 ngày; hẹn xa hơn sẽ được reconcile lại sau

/** Lên lịch bằng timer khi ứng dụng đang mở/đã cài PWA; hiển thị qua Service Worker nếu có quyền. */
@Injectable({ providedIn: 'root' })
export class InAppReminderScheduler implements ReminderScheduler {
  private readonly permission = inject(NotificationPermissionService);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Khi không có quyền thông báo hệ thống, UI hiển thị toast từ signal này. */
  readonly fallback = signal<ReminderPlan | null>(null);

  async apply(plans: ReminderPlan[]) {
    const wanted = new Map(plans.map((p) => [p.id, p]));
    for (const [id, t] of this.timers) {
      if (!wanted.has(id)) {
        clearTimeout(t);
        this.timers.delete(id);
      }
    }
    const scheduled: string[] = [];
    const skipped: string[] = [];
    for (const plan of plans) {
      const delay = plan.fireAt - Date.now();
      if (delay > MAX_TIMEOUT || delay < 0) {
        skipped.push(plan.id);
        continue;
      }
      if (!this.timers.has(plan.id)) {
        this.timers.set(
          plan.id,
          setTimeout(() => {
            this.timers.delete(plan.id);
            void this.show(plan);
          }, delay),
        );
      }
      scheduled.push(plan.id);
    }
    return { scheduled, skipped };
  }

  cancelAll(): void {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  private async show(plan: ReminderPlan): Promise<void> {
    if (this.permission.state() === 'granted') {
      const options = { body: plan.body, tag: plan.id, data: { eventId: plan.eventId } };
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(plan.title, options);
        return;
      }
      new Notification(plan.title, options);
      return;
    }
    this.fallback.set(plan);
  }
}
