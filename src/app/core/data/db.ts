import { InjectionToken } from '@angular/core';
import Dexie, { type Table } from 'dexie';
import type { AppEvent, Contact, ContactGroup, Family, FamilyMember, NotificationSchedule } from '../domain/models';

export interface SettingRow {
  key: string;
  value: unknown;
}

/**
 * IndexedDB là nguồn dữ liệu chính (thay SQLite của bản mobile).
 * Sự kiện lưu dạng aggregate: rule/reminders/exceptions nằm trong cùng bản ghi nên mỗi lần ghi là nguyên tử.
 * Thêm schema mới: tăng `version(n)` và viết `.upgrade()`; không sửa version cũ.
 */
export class AppDb extends Dexie {
  events!: Table<AppEvent, string>;
  contactGroups!: Table<ContactGroup, string>;
  families!: Table<Family, string>;
  contacts!: Table<Contact, string>;
  familyMembers!: Table<FamilyMember, string>;
  notificationSchedules!: Table<NotificationSchedule, string>;
  settings!: Table<SettingRow, string>;

  constructor(name = 'event-reminder') {
    super(name);
    this.version(1).stores({
      events: 'id, startDate, status, category',
      contactGroups: 'id, kind, sortOrder',
      families: 'id, groupId',
      contacts: 'id, displayName',
      familyMembers: 'id, familyId, contactId, &[familyId+contactId]',
      notificationSchedules: 'id, eventId, scheduledAt, &[occurrenceKey+reminderId]',
      settings: 'key',
    });
    this.on('populate', (tx) => {
      tx.table('contactGroups').bulkAdd([
        { id: 'group-paternal', name: 'Bên nội', kind: 'paternal', sortOrder: 0 },
        { id: 'group-maternal', name: 'Bên ngoại', kind: 'maternal', sortOrder: 1 },
      ] satisfies ContactGroup[]);
    });
  }
}

export const APP_DB = new InjectionToken<AppDb>('APP_DB', { providedIn: 'root', factory: () => new AppDb() });
