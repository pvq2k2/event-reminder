import { inject, Injectable } from '@angular/core';

import type { Contact, ContactGroup, Family, FamilyMember } from '../domain/models';
import { APP_DB } from './db';

export interface FamilyNode extends Family {
  members: (FamilyMember & { contact: Contact })[];
}
export interface GroupNode extends ContactGroup {
  families: FamilyNode[];
}
export type DeleteFamilyMode = 'unlink-only' | 'remove-exclusive-contacts';

/** Bỏ dấu + hạ chữ thường để tìm "ong" ra "Ông". */
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

@Injectable({ providedIn: 'root' })
export class ContactRepository {
  private readonly db = inject(APP_DB);

  async createContact(input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    if (!input.displayName.trim()) throw new Error('Tên liên hệ không được để trống');
    const now = new Date().toISOString();
    const contact: Contact = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await this.db.contacts.add(contact);
    return contact;
  }

  async createFamily(groupId: string, name: string): Promise<Family> {
    if (!name.trim()) throw new Error('Tên gia đình không được để trống');
    const sortOrder = await this.db.families.where('groupId').equals(groupId).count();
    const family: Family = { id: crypto.randomUUID(), groupId, name: name.trim(), sortOrder };
    await this.db.families.add(family);
    return family;
  }

  /** Một người nằm trong nhiều gia đình mà không nhân bản hồ sơ; liên kết trùng trả về bản cũ. */
  async link(familyId: string, contactId: string, relationship: string): Promise<FamilyMember> {
    const existing = await this.db.familyMembers.where('[familyId+contactId]').equals([familyId, contactId]).first();
    if (existing) return existing;
    const member: FamilyMember = { id: crypto.randomUUID(), familyId, contactId, relationship };
    await this.db.familyMembers.add(member);
    return member;
  }

  async unlink(memberId: string): Promise<void> {
    await this.db.familyMembers.delete(memberId);
  } // không xóa hồ sơ

  async deleteFamily(familyId: string, mode: DeleteFamilyMode): Promise<void> {
    await this.db.transaction('rw', this.db.families, this.db.familyMembers, this.db.contacts, async () => {
      const members = await this.db.familyMembers.where('familyId').equals(familyId).toArray();
      await this.db.familyMembers.where('familyId').equals(familyId).delete();
      await this.db.families.delete(familyId);
      if (mode === 'remove-exclusive-contacts') {
        for (const m of members) {
          if ((await this.db.familyMembers.where('contactId').equals(m.contactId).count()) === 0)
            await this.db.contacts.delete(m.contactId);
        }
      }
    });
  }

  /** Xóa liên hệ KHÔNG xóa sự kiện; chỉ gỡ liên kết khi người dùng xác nhận (`unlinkEvents`). */
  async deleteContact(contactId: string, unlinkEvents: boolean): Promise<void> {
    await this.db.transaction('rw', this.db.contacts, this.db.familyMembers, this.db.events, async () => {
      await this.db.familyMembers.where('contactId').equals(contactId).delete();
      await this.db.contacts.delete(contactId);
      if (unlinkEvents) {
        await this.db.events
          .filter((e) => e.contactIds.includes(contactId))
          .modify((e) => {
            e.contactIds = e.contactIds.filter((id) => id !== contactId);
          });
      }
    });
  }

  async tree(): Promise<GroupNode[]> {
    const [groups, families, members, contacts] = await Promise.all([
      this.db.contactGroups.orderBy('sortOrder').toArray(),
      this.db.families.toArray(),
      this.db.familyMembers.toArray(),
      this.db.contacts.toArray(),
    ]);
    const byId = new Map(contacts.map((c) => [c.id, c]));
    return groups.map((g) => ({
      ...g,
      families: families
        .filter((f) => f.groupId === g.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((f) => ({
          ...f,
          members: members
            .filter((m) => m.familyId === f.id)
            .flatMap((m) => {
              const contact = byId.get(m.contactId);
              return contact ? [{ ...m, contact }] : [];
            }),
        })),
    }));
  }

  async search(query: string): Promise<Contact[]> {
    const q = normalize(query);
    if (!q) return [];
    return this.db.contacts
      .filter((c) => normalize(c.displayName).includes(q) || (c.phone ?? '').includes(q))
      .toArray();
  }
}
