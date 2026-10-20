import type { HHmm, ISODate } from './date';

export type EventCategory = 'work' | 'birthday' | 'memorial' | 'other';
export type EventStatus = 'active' | 'completed' | 'cancelled';
export type CalendarSystem = 'gregorian' | 'lunar';
export type LeapMonthPolicy = 'regular' | 'leap' | 'both';
/** Tháng không có ngày 29/30/31: lấy ngày cuối tháng hoặc bỏ qua lần đó. */
export type MissingDayPolicy = 'clamp' | 'skip';

export type EndCondition = { type: 'never' } | { type: 'until'; date: ISODate } | { type: 'count'; count: number };

/** Discriminated union: không cho phép tổ hợp vô nghĩa (vd weekly không có thứ). */
export type RecurrenceRule =
  | { kind: 'none' }
  | { kind: 'daily'; interval: number; end: EndCondition }
  | { kind: 'weekly'; interval: number; weekdays: number[]; end: EndCondition }
  | { kind: 'monthly'; interval: number; monthDay: number; missingDay: MissingDayPolicy; end: EndCondition }
  | { kind: 'yearly-solar'; interval: number; month: number; day: number; end: EndCondition }
  | {
      kind: 'yearly-lunar';
      interval: number;
      lunarMonth: number;
      lunarDay: number;
      leapPolicy: LeapMonthPolicy;
      end: EndCondition;
    };

export interface Reminder {
  id: string;
  /** Nhắc trước N phút. Sự kiện cả ngày: bội số của 1440 = số ngày trước, giờ nhắc = allDayReminderTime. */
  offsetMinutes: number;
  enabled: boolean;
}

export type EventException =
  | { occurrenceKey: string; action: 'skip' }
  | {
      occurrenceKey: string;
      action: 'override';
      date?: ISODate;
      startTime?: HHmm | null;
      endTime?: HHmm | null;
      title?: string;
      description?: string;
    };

export interface AppEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: ISODate;
  startTime: HHmm | null;
  endDate?: ISODate;
  endTime?: HHmm | null;
  timezone: string;
  isAllDay: boolean;
  calendarSystem: CalendarSystem;
  category: EventCategory;
  status: EventStatus;
  rule: RecurrenceRule;
  reminders: Reminder[];
  exceptions: EventException[];
  contactIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Occurrence {
  eventId: string;
  occurrenceKey: string;
  date: ISODate;
  endDate: ISODate;
  startTime: HHmm | null;
  endTime: HHmm | null;
  isAllDay: boolean;
  title: string;
  category: EventCategory;
  location?: string;
  /** Các mốc nhắc đang bật của sự kiện, tính bằng phút trước giờ diễn ra. */
  reminderOffsets: number[];
}

export interface Contact {
  id: string;
  displayName: string;
  phone?: string;
  email?: string;
  birthDateGregorian?: ISODate;
  /** Lưu riêng nếu người dùng nhập ngày sinh theo âm lịch. */
  birthLunar?: { day: number; month: number; year?: number; isLeapMonth: boolean };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  kind: 'paternal' | 'maternal' | 'custom';
  sortOrder: number;
}

export interface Family {
  id: string;
  groupId: string;
  name: string;
  notes?: string;
  sortOrder: number;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  contactId: string;
  relationship: string;
  notes?: string;
}

export interface NotificationSchedule {
  id: string;
  eventId: string;
  occurrenceKey: string;
  reminderId: string;
  scheduledAt: number;
  status: 'scheduled' | 'failed' | 'cancelled' | 'delivered';
  updatedAt: number;
}
