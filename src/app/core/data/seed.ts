import { inject, Injectable } from '@angular/core';

import { addDays } from '../domain/date';
import { Clock } from './clock';
import { ContactRepository } from './contact.repository';
import { EventService } from './event.service';

/** Dữ liệu mẫu cho môi trường phát triển (nút trong Cài đặt, chỉ hiện khi isDevMode). */
@Injectable({ providedIn: 'root' })
export class DemoSeed {
  private readonly events = inject(EventService);
  private readonly contacts = inject(ContactRepository);
  private readonly clock = inject(Clock);

  async run(): Promise<void> {
    const today = this.clock.todayIso();
    const r = (id: string, offsetMinutes: number) => ({ id, offsetMinutes, enabled: true });
    const never = { type: 'never' } as const;
    await this.events.create({
      title: 'Giỗ ông nội',
      startDate: '2020-01-01',
      startTime: '19:00',
      isAllDay: false,
      calendarSystem: 'lunar',
      category: 'memorial',
      location: 'Nhà bác cả',
      rule: { kind: 'yearly-lunar', interval: 1, lunarMonth: 8, lunarDay: 29, leapPolicy: 'regular', end: never },
      reminders: [r('a', 1440), r('b', 60), r('c', 30)],
      exceptions: [],
      contactIds: [],
    });
    await this.events.create({
      title: 'Sinh nhật bà ngoại',
      startDate: '2020-03-12',
      startTime: null,
      isAllDay: true,
      calendarSystem: 'gregorian',
      category: 'birthday',
      rule: { kind: 'yearly-solar', interval: 1, month: 3, day: 12, end: never },
      reminders: [r('a', 1440)],
      exceptions: [],
      contactIds: [],
    });
    await this.events.create({
      title: 'Đóng tiền điện',
      startDate: today,
      startTime: '09:00',
      isAllDay: false,
      calendarSystem: 'gregorian',
      category: 'work',
      rule: {
        kind: 'monthly',
        interval: 1,
        monthDay: Number(addDays(today, 0).slice(8)),
        missingDay: 'clamp',
        end: never,
      },
      reminders: [r('a', 30)],
      exceptions: [],
      contactIds: [],
    });
    const family = await this.contacts.createFamily('group-paternal', 'Gia đình ông bà nội');
    for (const [name, rel] of [
      ['Ông nội', 'Cụ'],
      ['Bà nội', 'Bà'],
      ['Bác cả Hùng', 'Con trưởng'],
    ] as const) {
      const c = await this.contacts.createContact({ displayName: name });
      await this.contacts.link(family.id, c.id, rel);
    }
  }
}
