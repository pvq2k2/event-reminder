import { Injectable, inject } from '@angular/core';
import type { NotificationSchedule } from '../domain/models';
import { APP_DB } from './db';

/** Đọc trạng thái lên lịch nhắc để UI phản ánh lỗi mà không phải đoán. */
@Injectable({ providedIn: 'root' })
export class NotificationScheduleRepository {
  private readonly db = inject(APP_DB);

  failed(): Promise<NotificationSchedule[]> {
    return this.db.notificationSchedules.filter((s) => s.status === 'failed').toArray();
  }
}
