import { Injectable, inject } from '@angular/core';
import { APP_DB } from './db';

export interface AppSettings {
  weekStartsOn: 0 | 1;
  showLunarDate: boolean;
  notificationsEnabled: boolean;
  defaultReminderOffsets: number[];
  /** Giờ nhắc cho sự kiện cả ngày, `HH:mm`. */
  allDayReminderTime: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  weekStartsOn: 1,
  showLunarDate: true,
  notificationsEnabled: true,
  defaultReminderOffsets: [30, 1440],
  allDayReminderTime: '09:00',
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Kiểm tra từng khóa; giá trị hỏng/thiếu quay về mặc định (đọc) hoặc báo lỗi (ghi). Không dùng thư viện để giữ bundle nhỏ. */
const validators: { [K in keyof AppSettings]: (v: unknown) => v is AppSettings[K] } = {
  weekStartsOn: (v): v is 0 | 1 => v === 0 || v === 1,
  showLunarDate: (v): v is boolean => typeof v === 'boolean',
  notificationsEnabled: (v): v is boolean => typeof v === 'boolean',
  defaultReminderOffsets: (v): v is number[] => Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0),
  allDayReminderTime: (v): v is string => typeof v === 'string' && TIME.test(v),
};

@Injectable({ providedIn: 'root' })
export class SettingsRepository {
  private readonly db = inject(APP_DB);

  async get(): Promise<AppSettings> {
    const raw = Object.fromEntries((await this.db.settings.toArray()).map((r) => [r.key, r.value]));
    const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(validators) as (keyof AppSettings)[]) {
      if (validators[key](raw[key])) out[key] = raw[key];
    }
    return out as unknown as AppSettings;
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    for (const [key, value] of Object.entries(patch)) {
      const check = validators[key as keyof AppSettings] as ((v: unknown) => boolean) | undefined;
      if (!check || !check(value)) throw new Error(`Giá trị cài đặt không hợp lệ: ${key}`);
    }
    const next = { ...(await this.get()), ...patch };
    await this.db.settings.bulkPut(Object.entries(next).map(([key, value]) => ({ key, value })));
    return next;
  }
}
