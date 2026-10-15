import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContactRepository } from './contact.repository';
import { APP_DB, AppDb } from './db';
import { EventRepository, EventValidationError, type NewEvent } from './event.repository';
import { SettingsRepository } from './settings.repository';

let db: AppDb;
beforeEach(() => {
  db = new AppDb(`test-${crypto.randomUUID()}`);
  TestBed.configureTestingModule({ providers: [{ provide: APP_DB, useValue: db }] });
});

const ev = (over: Partial<NewEvent> = {}): NewEvent => ({
  title: 'Giỗ ông nội',
  startDate: '2025-01-01',
  startTime: '19:00',
  isAllDay: false,
  calendarSystem: 'lunar',
  category: 'memorial',
  rule: {
    kind: 'yearly-lunar',
    interval: 1,
    lunarMonth: 8,
    lunarDay: 29,
    leapPolicy: 'regular',
    end: { type: 'never' },
  },
  reminders: [{ id: 'r1', offsetMinutes: 30, enabled: true }],
  exceptions: [],
  contactIds: [],
  ...over,
});

describe('EventRepository', () => {
  it('tạo, truy vấn theo khoảng ngày, sửa, xóa', async () => {
    const repo = TestBed.inject(EventRepository);
    const e = await repo.create(ev());
    expect((await repo.occurrencesInRange('2026-10-01', '2026-10-31')).map((o) => o.date)).toEqual(['2026-10-09']);
    await repo.update(e.id, { title: 'Giỗ cụ' });
    expect((await repo.get(e.id))?.title).toBe('Giỗ cụ');
    await db.notificationSchedules.add({
      id: 's',
      eventId: e.id,
      occurrenceKey: 'k',
      reminderId: 'r1',
      scheduledAt: 1,
      status: 'scheduled',
      updatedAt: 1,
    });
    await repo.delete(e.id);
    expect(await repo.get(e.id)).toBeUndefined();
    expect(await db.notificationSchedules.count()).toBe(0);
  });

  it('từ chối dữ liệu không hợp lệ', async () => {
    await expect(TestBed.inject(EventRepository).create(ev({ title: '' }))).rejects.toBeInstanceOf(
      EventValidationError,
    );
  });
});

describe('ContactRepository', () => {
  it('có sẵn Bên nội/Bên ngoại; liên kết nhiều gia đình không nhân bản hồ sơ', async () => {
    const repo = TestBed.inject(ContactRepository);
    const [paternal] = await repo.tree();
    expect(paternal.name).toBe('Bên nội');
    const f1 = await repo.createFamily('group-paternal', 'Gia đình ông bà nội');
    const f2 = await repo.createFamily('group-paternal', 'Gia đình chú A');
    const c = await repo.createContact({ displayName: 'Bác Hùng' });
    const a = await repo.link(f1.id, c.id, 'Con trưởng');
    const b = await repo.link(f1.id, c.id, 'Con trưởng');
    await repo.link(f2.id, c.id, 'Anh');
    expect(a.id).toBe(b.id);
    expect(await db.contacts.count()).toBe(1);
    expect(await db.familyMembers.count()).toBe(2);
  });

  it('quy tắc xóa: xóa gia đình / liên hệ không làm mất sự kiện', async () => {
    const repo = TestBed.inject(ContactRepository);
    const events = TestBed.inject(EventRepository);
    const f = await repo.createFamily('group-maternal', 'Gia đình dì C');
    const c = await repo.createContact({ displayName: 'Dì C' });
    await repo.link(f.id, c.id, 'Dì');
    const e = await events.create(ev({ contactIds: [c.id] }));
    await repo.deleteFamily(f.id, 'unlink-only');
    expect(await db.contacts.count()).toBe(1);
    await repo.deleteContact(c.id, true);
    expect((await events.get(e.id))?.contactIds).toEqual([]);
  });

  it('tìm kiếm không phân biệt dấu', async () => {
    const repo = TestBed.inject(ContactRepository);
    await repo.createContact({ displayName: 'Ông nội' });
    await repo.createContact({ displayName: 'Cô Lan' });
    expect((await repo.search('ong')).map((c) => c.displayName)).toEqual(['Ông nội']);
  });
});

describe('SettingsRepository', () => {
  it('trả mặc định và lưu cập nhật có kiểm tra kiểu', async () => {
    const repo = TestBed.inject(SettingsRepository);
    expect((await repo.get()).weekStartsOn).toBe(1);
    await repo.update({ showLunarDate: false });
    expect((await repo.get()).showLunarDate).toBe(false);
    await expect(repo.update({ allDayReminderTime: '25:00' })).rejects.toThrow();
  });
});
