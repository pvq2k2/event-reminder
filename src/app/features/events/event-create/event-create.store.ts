import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Clock } from '@core/data/clock';
import { ContactRepository } from '@core/data/contact.repository';
import type { NewEvent } from '@core/data/event.repository';
import { addDays, daysInMonth, formatIso, parseIso } from '@core/domain/date';
import { canChiYear, formatLunar, gregorianToLunar, lunarToGregorian } from '@core/domain/lunar';
import type { EventCategory, LeapMonthPolicy, MissingDayPolicy, RecurrenceRule } from '@core/domain/models';
import { getOccurrencesInRange } from '@core/domain/recurrence';
import { validateEventDraft } from '@core/domain/validation';
import { inputVariants } from '@shared/components/input/input.variants';
import type { WheelOption } from '@shared/ui/wheel-picker/wheel-picker.component';
import { formatVi, mergeClasses, weekdayVi } from '@shared/utils';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';

import { QUICK_OFFSETS, type RepeatKind } from './event-create.types';

/**
 * State + logic của form tạo sự kiện 4 bước. Các component bước inject store này
 * để cùng dùng chung form/option/derived; page giữ điều hướng bước và lưu.
 * Các ô nhập trong component bước bind `[formControl]="store.form.controls.x"`
 * (không dùng `formControlName`, vì directive đó inject ControlContainer bằng
 * `@Host()` nên không thấy form ở component cha).
 */
@Injectable()
export class EventCreateStore {
  private readonly contactsRepo = inject(ContactRepository);
  private readonly clock = inject(Clock);

  /** "Họp mặt" trong design dùng chung giá trị `other` với "Khác" (model chỉ có 4 loại). */
  readonly categoryOpts: readonly { key: string; label: string; value: EventCategory }[] = [
    { key: 'work', label: 'Công việc', value: 'work' },
    { key: 'birthday', label: 'Sinh nhật', value: 'birthday' },
    { key: 'memorial', label: 'Giỗ', value: 'memorial' },
    { key: 'meeting', label: 'Họp mặt', value: 'other' },
    { key: 'other', label: 'Khác', value: 'other' },
  ];
  readonly otherLabel = signal<'meeting' | 'other'>('other');
  readonly systems = [
    { id: 'gregorian', label: 'Dương lịch' },
    { id: 'lunar', label: 'Âm lịch' },
  ] as const;
  readonly repeats: readonly { id: RepeatKind; label: string; hint: string }[] = [
    { id: 'none', label: 'Không lặp', hint: 'Chỉ diễn ra một lần' },
    { id: 'daily', label: 'Hằng ngày / tuần / tháng', hint: 'Chọn khoảng cách và thứ trong tuần' },
    { id: 'yearly-lunar', label: 'Hằng năm theo âm lịch', hint: 'Mỗi 29/8 âm lịch · hợp cho giỗ, rằm' },
    { id: 'yearly-solar', label: 'Hằng năm theo dương lịch', hint: 'Hợp cho sinh nhật, kỷ niệm' },
  ];
  readonly subKindOpts = [
    { id: 'daily', label: 'Hằng ngày' },
    { id: 'weekly', label: 'Hằng tuần' },
    { id: 'monthly', label: 'Hằng tháng' },
  ] as const;
  readonly weekOpts = [
    { v: 1, label: 'T2' },
    { v: 2, label: 'T3' },
    { v: 3, label: 'T4' },
    { v: 4, label: 'T5' },
    { v: 5, label: 'T6' },
    { v: 6, label: 'T7' },
    { v: 0, label: 'CN' },
  ];
  readonly leapOpts: readonly { id: LeapMonthPolicy; label: string }[] = [
    { id: 'regular', label: 'Tháng thường' },
    { id: 'leap', label: 'Tháng nhuận' },
    { id: 'both', label: 'Cả hai' },
  ];
  readonly missingOpts: readonly { id: MissingDayPolicy; label: string }[] = [
    { id: 'clamp', label: 'Dồn về cuối tháng' },
    { id: 'skip', label: 'Bỏ qua tháng thiếu' },
  ];
  readonly endOpts = [
    { id: 'never', label: 'Không bao giờ' },
    { id: 'until', label: 'Vào ngày' },
    { id: 'count', label: 'Sau N lần' },
  ] as const;
  readonly lunarDayOpts = EventCreateStore.nums(30);
  readonly lunarMonthOpts = EventCreateStore.nums(12);
  readonly gregMonthOpts = EventCreateStore.nums(12);
  readonly lunarYearOpts: readonly WheelOption[] = (() => {
    const y = Number(this.clock.todayIso().slice(0, 4));
    return Array.from({ length: 16 }, (_, i) => ({ value: String(y - 5 + i), label: String(y - 5 + i) }));
  })();
  readonly gregYearOpts: readonly WheelOption[] = (() => {
    const y = Number(this.clock.todayIso().slice(0, 4));
    return Array.from({ length: 111 }, (_, i) => ({ value: String(y - 100 + i), label: String(y - 100 + i) }));
  })();

  private static nums(n: number): readonly WheelOption[] {
    return Array.from({ length: n }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  }

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    category: new FormControl<EventCategory>('memorial', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    calendarSystem: new FormControl<'gregorian' | 'lunar'>('gregorian', { nonNullable: true }),
    startDate: new FormControl(this.clock.todayIso(), { nonNullable: true }),
    lunarDay: new FormControl(29, { nonNullable: true }),
    lunarMonth: new FormControl(8, { nonNullable: true }),
    lunarYear: new FormControl(2026, { nonNullable: true }),
    isLeapMonth: new FormControl(false, { nonNullable: true }),
    isAllDay: new FormControl(true, { nonNullable: true }),
    startTime: new FormControl('19:00', { nonNullable: true }),
    endTime: new FormControl('21:00', { nonNullable: true }),
    repeatKind: new FormControl<RepeatKind>('yearly-lunar', { nonNullable: true }),
    subKind: new FormControl<'daily' | 'weekly' | 'monthly'>('monthly', { nonNullable: true }),
    interval: new FormControl(1, { nonNullable: true }),
    leapPolicy: new FormControl<LeapMonthPolicy>('regular', { nonNullable: true }),
    missingDay: new FormControl<MissingDayPolicy>('clamp', { nonNullable: true }),
    endType: new FormControl<'never' | 'until' | 'count'>('never', { nonNullable: true }),
    endConditionDate: new FormControl('', { nonNullable: true }),
    endConditionCount: new FormControl(10, { nonNullable: true }),
    allDayTime: new FormControl('09:00', { nonNullable: true }),
  });
  readonly customOffset = new FormControl(60, { nonNullable: true });

  readonly contacts = toSignal<{ id: string; displayName: string }[] | null>(
    from(
      liveQuery(() =>
        this.contactsRepo
          .tree()
          .then((g) => g.flatMap((x) => x.families.flatMap((f) => f.members.map((m) => m.contact)))),
      ),
    ),
    { initialValue: null },
  );
  readonly selectedContacts = signal<string[]>([]);
  readonly selectedWeekdays = signal<number[]>([5]);
  readonly selectedOffsets = signal<number[]>([1440, 60, 30]);
  readonly showCustom = signal(false);
  /** Các mốc nhắc hiển thị dạng danh sách công tắc: mốc nhanh + mốc tùy chọn đã chọn. */
  readonly reminderRows = computed(() => [
    ...QUICK_OFFSETS,
    ...this.selectedOffsets().filter((o) => !QUICK_OFFSETS.includes(o)),
  ]);

  // Các getter dưới là method (không phải computed) vì giá trị form không phải
  // signal: computed sẽ chỉ tính một lần và kẹt mãi giá trị đầu.
  repeatKind(): RepeatKind {
    return this.form.controls.repeatKind.value;
  }
  endType(): 'never' | 'until' | 'count' {
    return this.form.controls.endType.value;
  }
  lunarYearVal(): number {
    return this.form.controls.lunarYear.value;
  }
  showWeekdays(): boolean {
    return (
      this.repeatKind() === 'weekly' || (this.repeatKind() === 'daily' && this.form.controls.subKind.value === 'weekly')
    );
  }
  showMissingDay(): boolean {
    return (
      this.repeatKind() === 'monthly' ||
      (this.repeatKind() === 'daily' && this.form.controls.subKind.value === 'monthly')
    );
  }
  intervalUnit(): string {
    switch (this.form.controls.subKind.value) {
      case 'weekly':
        return 'tuần';
      case 'monthly':
        return 'tháng';
      case 'daily':
        return 'ngày';
    }
  }
  monthDayHint(): number {
    try {
      return parseIso(this.lunarResolved() ?? this.clock.todayIso())[2];
    } catch {
      return this.form.controls.lunarDay.value;
    }
  }

  lunarResolved(): string | null {
    if (this.form.controls.calendarSystem.value !== 'lunar') return this.form.controls.startDate.value;
    return lunarToGregorian({
      day: this.form.controls.lunarDay.value,
      month: this.form.controls.lunarMonth.value,
      year: this.form.controls.lunarYear.value,
      isLeapMonth: this.form.controls.isLeapMonth.value,
    });
  }

  lunarLine(): string {
    try {
      const l = gregorianToLunar(this.form.controls.startDate.value || this.clock.todayIso());
      return `${formatLunar(l, true)}`;
    } catch {
      return '';
    }
  }

  titleError(): string | null {
    const c = this.form.controls.title;
    if (!c.touched && !c.dirty) return null;
    if (c.hasError('required') || !c.value.trim()) return 'Tiêu đề không được để trống';
    if (c.hasError('maxlength')) return 'Tiêu đề tối đa 200 ký tự';
    return null;
  }
  dateError(): string | null {
    return /^\d{4}-\d{2}-\d{2}$/.test(this.form.controls.startDate.value) ? null : 'Ngày bắt đầu không hợp lệ';
  }
  timeError(): string | null {
    if (this.form.controls.isAllDay.value) return null;
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(this.form.controls.startTime.value)
      ? null
      : 'Cần giờ bắt đầu cho sự kiện không cả ngày';
  }
  endTimeError(): string | null {
    if (this.form.controls.isAllDay.value || !this.form.controls.endTime.value) return null;
    try {
      return validateEventDraft(this.draft()).endTime ?? null;
    } catch {
      return null;
    }
  }
  validateStep(step: number): boolean {
    const controls = this.form.controls;
    if (step === 1) {
      controls.title.markAsTouched();
      return !!controls.title.value.trim() && !controls.title.hasError('maxlength');
    }
    if (step === 2) {
      controls.startTime.markAsTouched();
      controls.endTime.markAsTouched();
      const lunarResolved = controls.calendarSystem.value !== 'lunar' || this.lunarResolved() !== null;
      return lunarResolved && !this.dateError() && !this.timeError() && !this.endTimeError();
    }
    if (step === 3) return !this.ruleError();
    return true;
  }
  ruleError(): string | null {
    try {
      const e = validateEventDraft(this.draft());
      return e.rule ?? null;
    } catch {
      return null;
    }
  }

  preview(): ReturnType<typeof getOccurrencesInRange> {
    try {
      const d = this.draft();
      const fake = {
        id: 'preview',
        title: d.title || 'x',
        startDate: d.startDate,
        startTime: d.startTime,
        endTime: d.endTime,
        isAllDay: d.isAllDay,
        rule: d.rule,
        category: this.form.controls.category.value,
      } as Parameters<typeof getOccurrencesInRange>[0];
      return getOccurrencesInRange(fake, d.startDate, addDays(d.startDate, 1825)).slice(0, 5);
    } catch {
      return [];
    }
  }

  /** Dòng 1 thẻ "Xem lại": ngày (âm/dương) · giờ. */
  reviewLine1(): string {
    const time = this.form.controls.isAllDay.value
      ? 'cả ngày'
      : `${this.form.controls.startTime.value}–${this.form.controls.endTime.value}`;
    if (this.form.controls.calendarSystem.value === 'lunar') {
      const resolved = this.lunarResolved();
      return [
        `âm ${this.form.controls.lunarDay.value}/${this.form.controls.lunarMonth.value}`,
        resolved ? formatVi(resolved) : '',
        time,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    return [formatVi(this.form.controls.startDate.value || ''), time].filter(Boolean).join(' · ');
  }
  /** Dòng 2 thẻ "Xem lại": kiểu lặp · địa điểm. */
  reviewLine2(): string {
    const repeat = this.repeats.find((r) => r.id === this.repeatKind())?.label ?? '';
    const location = this.form.controls.location.value.trim();
    return location ? `${repeat} · ${location}` : repeat;
  }

  canChi = (y: number) => canChiYear(y);
  formatVi = formatVi;
  weekdayVi = weekdayVi;
  str = (v: number): string => String(v);
  /** Textarea ké style từ z-input (Zard chưa có textarea) để không bao giờ lệch. */
  textareaCls(): string {
    return mergeClasses(inputVariants(), 'h-auto min-h-24 bg-card py-2');
  }
  offsetLabel(o: number): string {
    if (o === 0) return 'Đúng giờ';
    if (o >= 1440) return `Trước ${Math.floor(o / 1440)} ngày`;
    if (o >= 60) return `Trước ${Math.floor(o / 60)} giờ`;
    return `Trước ${o} phút`;
  }

  isCategoryOn(c: { key: string; value: EventCategory }): boolean {
    if (this.form.controls.category.value !== c.value) return false;
    return c.value !== 'other' || this.otherLabel() === c.key;
  }
  pickCategory(c: { key: string; value: EventCategory }): void {
    this.form.controls.category.setValue(c.value);
    if (c.value === 'other') this.otherLabel.set(c.key === 'meeting' ? 'meeting' : 'other');
  }
  setLunarPart(part: 'lunarDay' | 'lunarMonth' | 'lunarYear', v: string): void {
    const n = Number(v);
    if (Number.isInteger(n)) this.form.controls[part].setValue(n);
  }
  /** Tách ngày dương `YYYY-MM-DD` (không pad) để đưa vào bánh xe. */
  gregParts(): { y: string; m: string; d: string } {
    const raw = this.form.controls.startDate.value || this.clock.todayIso();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw) ?? /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.clock.todayIso());
    if (!m) return { y: '2026', m: '1', d: '1' };
    return { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) };
  }
  gregDayOpts(): readonly WheelOption[] {
    const p = this.gregParts();
    return EventCreateStore.nums(daysInMonth(Number(p.y), Number(p.m)));
  }
  setGregPart(part: 'y' | 'm' | 'd', v: string): void {
    const p = this.gregParts();
    const y = Math.min(2200, Math.max(1900, Number(part === 'y' ? v : p.y)));
    const m = Math.min(12, Math.max(1, Number(part === 'm' ? v : p.m)));
    const d = Math.min(daysInMonth(y, m), Math.max(1, Number(part === 'd' ? v : p.d)));
    if (![y, m, d].every(Number.isInteger)) return;
    this.form.controls.startDate.setValue(formatIso(y, m, d));
  }
  toggleContact(id: string): void {
    this.selectedContacts.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  toggleWeekday(v: number): void {
    this.selectedWeekdays.update((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }
  toggleOffset(o: number): void {
    this.selectedOffsets.update((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]));
  }
  addCustomOffset(): void {
    const n = Math.round(Math.min(10080, Math.max(0, this.customOffset.value)));
    this.selectedOffsets.update((s) => (s.includes(n) ? s : [...s, n]));
  }
  setRepeat(id: RepeatKind): void {
    this.form.controls.repeatKind.setValue(id);
    if (id === 'daily') this.form.controls.subKind.setValue('monthly');
  }
  setEnd(id: 'never' | 'until' | 'count'): void {
    this.form.controls.endType.setValue(id);
  }

  draft(): {
    title: string;
    startDate: string;
    startTime: string | null;
    endTime?: string | null;
    isAllDay: boolean;
    rule: RecurrenceRule;
  } {
    const v = this.form.getRawValue();
    const resolved = v.calendarSystem === 'lunar' ? (this.lunarResolved() ?? '0000-00-00') : v.startDate;
    const end: RecurrenceRule extends never
      ? never
      : { type: 'never' } | { type: 'until'; date: string } | { type: 'count'; count: number } =
      v.endType === 'until'
        ? { type: 'until', date: v.endConditionDate || resolved }
        : v.endType === 'count'
          ? { type: 'count', count: Math.max(1, v.endConditionCount) }
          : { type: 'never' };
    let rule: RecurrenceRule = { kind: 'none' };
    const rk = v.repeatKind;
    if (rk === 'daily') {
      const sub = v.subKind;
      if (sub === 'weekly')
        rule = { kind: 'weekly', interval: Math.max(1, v.interval), weekdays: this.selectedWeekdays(), end };
      else if (sub === 'monthly') {
        const [, , day] = parseIso(resolved);
        rule = { kind: 'monthly', interval: Math.max(1, v.interval), monthDay: day, missingDay: v.missingDay, end };
      } else rule = { kind: 'daily', interval: Math.max(1, v.interval), end };
    } else if (rk === 'weekly') {
      rule = { kind: 'weekly', interval: Math.max(1, v.interval), weekdays: this.selectedWeekdays(), end };
    } else if (rk === 'monthly') {
      const [, , day] = parseIso(resolved);
      rule = { kind: 'monthly', interval: Math.max(1, v.interval), monthDay: day, missingDay: v.missingDay, end };
    } else if (rk === 'yearly-solar') {
      const [, m, d] = parseIso(resolved);
      rule = { kind: 'yearly-solar', interval: 1, month: m, day: d, end };
    } else if (rk === 'yearly-lunar') {
      rule = {
        kind: 'yearly-lunar',
        interval: 1,
        lunarMonth: v.calendarSystem === 'lunar' ? v.lunarMonth : gregorianToLunar(resolved).month,
        lunarDay: v.calendarSystem === 'lunar' ? v.lunarDay : gregorianToLunar(resolved).day,
        leapPolicy: v.leapPolicy,
        end,
      };
    }
    return {
      title: v.title.trim(),
      startDate: resolved,
      startTime: v.isAllDay ? null : v.startTime,
      endTime: v.isAllDay ? null : v.endTime || undefined,
      isAllDay: v.isAllDay,
      rule,
    };
  }

  payload(quick: boolean): NewEvent {
    const v = this.form.getRawValue();
    const d = quick ? { ...this.draft(), rule: { kind: 'none' } as RecurrenceRule } : this.draft();
    return {
      title: d.title,
      description: v.description || undefined,
      location: v.location || undefined,
      startDate: d.startDate,
      startTime: d.startTime,
      endTime: d.endTime,
      timezone: 'Asia/Ho_Chi_Minh',
      isAllDay: d.isAllDay,
      calendarSystem: v.calendarSystem,
      category: v.category,
      rule: d.rule,
      reminders: (quick ? [30, 1440] : this.selectedOffsets()).map((offsetMinutes) => ({
        id: crypto.randomUUID(),
        offsetMinutes,
        enabled: true,
      })),
      exceptions: [],
      contactIds: [...this.selectedContacts()],
    };
  }
}
