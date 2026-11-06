import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Clock } from '@core/data/clock';
import { addDays, type ISODate } from '@core/domain/date';
import { canChiYear, gregorianToLunar } from '@core/domain/lunar';
import type { Occurrence } from '@core/domain/models';
import { AppIconComponent } from '@shared/ui';
import { mergeClasses } from '@shared/utils';

import { buildDayReminders, type DayReminder, type MonthModel } from './calendar.utils';

@Component({
  selector: 'app-calendar-day-aside',
  imports: [AppIconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block mt-3 lg:mt-0' },
  template: `
    <div class="flex flex-col gap-3 lg:gap-4">
      <section class="rounded-2xl border border-border bg-card p-3.5">
        <div class="flex items-center justify-between gap-2">
          <b class="text-sm">{{ month().label }}</b>
          <div class="flex items-center gap-1 text-muted-foreground">
            <button
              type="button"
              (click)="shiftMonth.emit(-1)"
              aria-label="Tháng trước"
              class="grid size-7 place-items-center rounded-md transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <app-icon name="chevronLeft" [size]="16" />
            </button>
            <button
              type="button"
              (click)="shiftMonth.emit(1)"
              aria-label="Tháng sau"
              class="grid size-7 place-items-center rounded-md transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <app-icon name="chevronRight" [size]="16" />
            </button>
          </div>
        </div>

        <div class="mt-2 grid grid-cols-7 text-center text-[0.6875rem] font-semibold text-muted-foreground">
          @for (label of weekdays(); track label) {
            <span class="py-1">{{ label }}</span>
          }
        </div>
        <div class="mt-0.5 grid grid-cols-7 gap-px">
          @for (day of month().days; track day.date) {
            <button
              type="button"
              (click)="selectDate.emit(day.date)"
              [attr.aria-label]="day.date"
              [attr.aria-pressed]="day.date === date()"
              [class]="dayClass(day)"
            >
              {{ day.day }}
              @if (eventDates().has(day.date)) {
                <i
                  [class]="
                    mergeClasses(
                      'absolute bottom-0.5 size-1 rounded-full',
                      day.date === date() ? 'bg-primary-foreground/70' : 'bg-primary'
                    )
                  "
                  aria-hidden="true"
                ></i>
              }
            </button>
          }
        </div>
      </section>

      <section class="rounded-2xl border border-border bg-card p-3.5">
        <p class="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">Âm lịch</p>
        <div class="mt-1.5 flex items-end gap-2.5">
          <span class="text-3xl leading-none font-bold">{{ lunar().day }}</span>
          <div class="min-w-0">
            <b class="block text-sm">Tháng {{ lunar().month }} · {{ yearName() }}</b>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ tomorrowLunar() }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-border bg-card p-3.5">
        <b class="text-sm">Nhắc trong ngày</b>
        <div class="mt-1">
          @for (reminder of reminders(); track reminder.key) {
            <a
              [routerLink]="['/events', reminder.occurrence.eventId]"
              [attr.aria-label]="'Xem chi tiết ' + reminder.occurrence.title"
              class="flex items-center justify-between gap-2 border-t border-border py-2 text-xs transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span class="flex min-w-0 items-center gap-2">
                <b class="w-11 shrink-0 font-semibold">{{ reminder.time }}</b>
                <span class="truncate">
                  {{ reminder.occurrence.title }}
                  <span class="text-muted-foreground">· {{ reminder.label }}</span>
                </span>
              </span>
              <span [class]="statusClass(reminder)">{{ reminderStatus(reminder) }}</span>
            </a>
          } @empty {
            <p class="py-3 text-xs text-muted-foreground">Không có lời nhắc trong ngày này.</p>
          }
        </div>
      </section>
    </div>
  `,
})
export class CalendarDayAside {
  private readonly clock = inject(Clock);

  readonly date = input.required<ISODate>();
  readonly month = input.required<MonthModel>();
  readonly items = input.required<readonly Occurrence[]>();
  readonly eventDates = input<ReadonlySet<string>>(new Set());
  readonly weekStartsOn = input<0 | 1>(1);
  readonly allDayReminderTime = input('09:00');
  readonly selectDate = output<ISODate>();
  readonly shiftMonth = output<number>();

  protected readonly lunar = computed(() => gregorianToLunar(this.date()));
  protected readonly yearName = computed(() => canChiYear(this.lunar().year));
  protected readonly tomorrowLunar = computed(() => {
    const tomorrow = gregorianToLunar(addDays(this.date(), 1));
    return tomorrow.day === 1
      ? `Mai là mùng 1 tháng ${tomorrow.month}`
      : `Mai là ${tomorrow.day}/${tomorrow.month} âm lịch`;
  });
  protected readonly reminders = computed(() =>
    buildDayReminders(this.items(), this.date(), this.allDayReminderTime()),
  );
  protected readonly weekdays = computed(() =>
    this.weekStartsOn() === 1 ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  );
  protected readonly mergeClasses = mergeClasses;

  protected dayClass(day: MonthModel['days'][number]): string {
    return mergeClasses(
      'relative flex h-8 items-center justify-center rounded-md text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
      !day.inMonth && 'opacity-35',
      day.date === this.date() && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
      day.date === this.clock.todayIso() && day.date !== this.date() && 'font-bold text-primary',
      day.date !== this.date() && 'hover:bg-accent',
    );
  }

  protected reminderStatus(reminder: DayReminder): 'Sắp tới' | 'Đã gửi' {
    const today = this.clock.todayIso();
    if (this.date() < today) return 'Đã gửi';
    if (this.date() > today) return 'Sắp tới';
    return reminder.time <= this.clock.nowTime() ? 'Đã gửi' : 'Sắp tới';
  }

  protected statusClass(reminder: DayReminder): string {
    return mergeClasses(
      'shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-medium',
      this.reminderStatus(reminder) === 'Đã gửi'
        ? 'bg-muted text-muted-foreground'
        : 'bg-accent text-accent-foreground',
    );
  }
}
