import { InjectionToken } from '@angular/core';

import type { ReminderPlan } from '../domain/reminders';

/**
 * Cổng (port) tới hệ thống nhắc nhở. Domain/use case chỉ biết interface này nên test bằng mock được.
 * Trên web không có API lên lịch thông báo khi tab đã đóng, xem docs/SOLUTION.md §8 để biết giới hạn và cách giảm thiểu.
 */
export interface ReminderScheduler {
  /** Đặt tập lời nhắc mong muốn: hủy cái thừa, thêm cái thiếu (idempotent). Trả về id đã được nhận lịch. */
  apply(plans: ReminderPlan[]): Promise<{ scheduled: string[]; skipped: string[] }>;
  cancelAll(): void;
}

export const REMINDER_SCHEDULER = new InjectionToken<ReminderScheduler>('REMINDER_SCHEDULER');
