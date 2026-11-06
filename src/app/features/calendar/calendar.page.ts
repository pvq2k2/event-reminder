import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Clock } from '@core/data/clock';
import { EventRepository } from '@core/data/event.repository';
import { DEFAULT_SETTINGS, SettingsRepository } from '@core/data/settings.repository';
import { addDays, daysInMonth, formatIso, parseIso } from '@core/domain/date';
import { canChiYear, formatLunar, gregorianToLunar } from '@core/domain/lunar';
import type { EventCategory, Occurrence } from '@core/domain/models';
import { ZardSonnerService } from '@shared/components/sonner/sonner.service';
import { ZardSwitchComponent } from '@shared/components/switch';
import { AppIconComponent } from '@shared/ui';
import { eventCategoryStyle, formatVi, mergeClasses, weekdayVi } from '@shared/utils';
import { liveQuery } from 'dexie';
import { from, switchMap } from 'rxjs';

import { buildMonthFor, buildWeek, type CalendarView, startOfWeekFor } from './calendar.utils';
import { CalendarDay } from './calendar-day';
import { CalendarDayAside } from './calendar-day-aside';
import { CalendarDayPanel } from './calendar-day-panel';
import { CalendarWeek } from './calendar-week';

const LUNAR_MONTH_NAMES = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'];
const CATEGORIES: readonly EventCategory[] = ['work', 'birthday', 'memorial', 'other'];
const WEEKDAYS = [
  { short: 'T2', long: 'Thứ 2' },
  { short: 'T3', long: 'Thứ 3' },
  { short: 'T4', long: 'Thứ 4' },
  { short: 'T5', long: 'Thứ 5' },
  { short: 'T6', long: 'Thứ 6' },
  { short: 'T7', long: 'Thứ 7' },
  { short: 'CN', long: 'CN' },
] as const;

@Component({
  selector: 'app-calendar-page',
  imports: [
    AppIconComponent,
    CalendarDay,
    CalendarDayAside,
    CalendarDayPanel,
    CalendarWeek,
    RouterLink,
    ZardSwitchComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-h-0' },
  template: `
    <div class="flex h-full min-h-0 w-full flex-col">
      <div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4 md:p-6">
        <div class="flex flex-col gap-3 md:gap-4">
          <header
            class="flex animate-in items-start justify-between gap-2 duration-300 fade-in slide-in-from-top-2 motion-reduce:animate-none md:items-center"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 md:gap-3">
                <h1 class="text-[1.375rem] font-bold tracking-tight md:text-2xl">{{ headerTitle() }}</h1>
                @if (headerMeta()) {
                  <span
                    class="hidden shrink-0 items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground md:inline-flex"
                  >
                    {{ headerMeta() }}
                  </span>
                }
              </div>
              @if (headerMeta()) {
                <p class="mt-0.5 text-xs text-muted-foreground md:hidden">{{ headerMeta() }}</p>
              }
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <div class="hidden rounded-lg bg-muted p-0.75 md:flex" role="group" aria-label="Chế độ xem lịch">
                <button
                  type="button"
                  (click)="setMode('month')"
                  [attr.aria-pressed]="mode() === 'month'"
                  [class]="modeButtonClass('month')"
                >
                  Tháng
                </button>
                <button
                  type="button"
                  (click)="setMode('week')"
                  [attr.aria-pressed]="mode() === 'week'"
                  [class]="modeButtonClass('week')"
                >
                  Tuần
                </button>
                <button
                  type="button"
                  (click)="setMode('day')"
                  [attr.aria-pressed]="mode() === 'day'"
                  [class]="modeButtonClass('day')"
                >
                  Ngày
                </button>
              </div>
              <button
                type="button"
                (click)="shift(-1)"
                [attr.aria-label]="mode() === 'month' ? 'Tháng trước' : mode() === 'week' ? 'Tuần trước' : 'Ngày trước'"
                class="grid size-11 cursor-pointer place-items-center rounded-lg border border-input bg-card transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:size-9"
              >
                <app-icon name="chevronLeft" />
              </button>
              <button
                type="button"
                (click)="shift(1)"
                [attr.aria-label]="mode() === 'month' ? 'Tháng sau' : mode() === 'week' ? 'Tuần sau' : 'Ngày sau'"
                class="grid size-11 cursor-pointer place-items-center rounded-lg border border-input bg-card transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:size-9"
              >
                <app-icon name="chevronRight" />
              </button>
              <button
                type="button"
                (click)="goToday()"
                class="hidden h-9 cursor-pointer items-center rounded-lg border border-input bg-card px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:inline-flex"
              >
                Hôm nay
              </button>
            </div>
          </header>

          <div
            class="flex animate-in rounded-lg bg-muted p-0.75 duration-300 fade-in slide-in-from-top-1 motion-reduce:animate-none md:hidden"
            role="group"
            aria-label="Chế độ xem lịch"
          >
            <button
              type="button"
              (click)="setMode('month')"
              [attr.aria-pressed]="mode() === 'month'"
              [class]="modeButtonClass('month', 'flex-1 py-1.5 text-center')"
            >
              Tháng
            </button>
            <button
              type="button"
              (click)="setMode('week')"
              [attr.aria-pressed]="mode() === 'week'"
              [class]="modeButtonClass('week', 'flex-1 py-1.5 text-center')"
            >
              Tuần
            </button>
            <button
              type="button"
              (click)="setMode('day')"
              [attr.aria-pressed]="mode() === 'day'"
              [class]="modeButtonClass('day', 'flex-1 py-1.5 text-center')"
            >
              Ngày
            </button>
          </div>

          <div
            class="hidden animate-in items-center gap-2 duration-300 fade-in slide-in-from-top-1 motion-reduce:animate-none md:flex"
          >
            @for (category of categories; track category) {
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                [class]="chipClass(category)"
              >
                <i [class]="mergeClasses('size-1.5 rounded-full', dot(category))" aria-hidden="true"></i>
                {{ categoryLabel(category) }}
              </span>
            }
            <span class="ml-auto text-xs text-muted-foreground">Hiển thị ngày âm</span>
            <z-switch [zChecked]="showLunar()" (zCheckedChange)="setShowLunar($event)">
              <span class="sr-only">Hiển thị ngày âm</span>
            </z-switch>
          </div>

          @if (mode() === 'month') {
            @for (key of [contentKey()]; track key) {
              <div
                [class]="
                  mergeClasses('lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4', contentAnimClass())
                "
              >
                <section class="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-3 md:p-0">
                  <div
                    class="grid grid-cols-7 py-2 text-center text-[0.6875rem] font-semibold text-muted-foreground md:bg-muted md:text-xs"
                  >
                    @for (d of weekdays(); track d.short) {
                      <div>
                        <span class="md:hidden">{{ d.short }}</span>
                        <span class="hidden md:inline">{{ d.long }}</span>
                      </div>
                    }
                  </div>
                  <div class="grid grid-cols-7 md:divide-x md:divide-border">
                    @for (c of cells(); track c.date; let i = $index) {
                      <button
                        type="button"
                        (click)="select(c.date)"
                        [attr.aria-label]="cellAriaLabel(c)"
                        [attr.aria-current]="c.date === clock.todayIso() ? 'date' : null"
                        [attr.data-selected]="c.date === selected()"
                        [class]="cellClass(c)"
                        [style.animation-delay.ms]="cellDelay(i)"
                      >
                        <span class="flex flex-col items-center gap-px md:flex-row md:justify-between md:gap-2">
                          <b [class]="dayClass(c)">{{ c.day }}</b>
                          @if (showLunar()) {
                            <span [class]="lunarClass(c)">{{ c.lunarLabel }}</span>
                          }
                        </span>
                        <span class="mt-0.5 flex h-1.25 items-center justify-center gap-0.5 md:hidden">
                          @for (o of byDate().get(c.date)?.slice(0, 3); track o.occurrenceKey) {
                            <i [class]="mergeClasses('size-1.25 rounded-full', dot(o.category))" aria-hidden="true"></i>
                          }
                        </span>
                        <span class="mt-1 hidden flex-col gap-0.5 md:flex">
                          @for (o of byDate().get(c.date)?.slice(0, 2); track o.occurrenceKey) {
                            <i
                              [class]="
                                mergeClasses(
                                  'truncate rounded-md px-1.5 py-px text-left text-[0.6875rem] not-italic',
                                  chipClass(o.category)
                                )
                              "
                              >{{ o.title }}</i
                            >
                          }
                          @if ((byDate().get(c.date)?.length ?? 0) > 2) {
                            <span class="px-1.5 text-left text-[0.625rem] font-medium text-muted-foreground">
                              +{{ byDate().get(c.date)!.length - 2 }}
                            </span>
                          }
                        </span>
                      </button>
                    }
                  </div>
                </section>

                @for (panelKey of [selected()]; track panelKey) {
                  <div
                    class="animate-in duration-200 fill-mode-both fade-in slide-in-from-right-1 motion-reduce:animate-none"
                  >
                    <app-calendar-day-panel [date]="selected()" [items]="selectedItems()" [showLunar]="showLunar()" />
                  </div>
                }
              </div>
            }
          } @else if (mode() === 'week') {
            @for (key of [contentKey()]; track key) {
              <div [class]="contentAnimClass()">
                <app-calendar-week
                  [week]="week()"
                  [itemsByDate]="byDate()"
                  [selected]="selected()"
                  [today]="clock.todayIso()"
                  [showLunar]="showLunar()"
                  (selectDate)="select($event)"
                />
              </div>
            }
          } @else {
            @for (key of [contentKey()]; track key) {
              <div
                [class]="
                  mergeClasses('lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4', contentAnimClass())
                "
              >
                <app-calendar-day [date]="selected()" [items]="selectedItems()" [today]="clock.todayIso()" />
                <app-calendar-day-aside
                  [date]="selected()"
                  [month]="dayMonth()"
                  [items]="selectedItems()"
                  [eventDates]="eventDates()"
                  [weekStartsOn]="weekStartsOn()"
                  [allDayReminderTime]="allDayReminderTime()"
                  (selectDate)="select($event)"
                  (shiftMonth)="shiftDayMonth($event)"
                />
              </div>
            }
          }
        </div>
      </div>
    </div>

    <a
      routerLink="/events/new"
      [queryParams]="{ date: selected() }"
      aria-label="Thêm sự kiện"
      class="fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-10 grid size-12 animate-in place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-colors duration-300 zoom-in-95 fade-in hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:animate-none md:hidden"
    >
      <app-icon name="plus" [size]="22" />
    </a>
  `,
})
export class CalendarPage {
  private readonly repo = inject(EventRepository);
  private readonly settingsRepo = inject(SettingsRepository);
  private readonly sonner = inject(ZardSonnerService);
  protected readonly clock = inject(Clock);
  protected readonly categories = CATEGORIES;
  protected readonly mode = signal<CalendarView>('month');
  protected readonly selected = signal(this.clock.todayIso());
  protected readonly view = signal((([y, m]) => ({ y, m }))(parseIso(this.clock.todayIso())));
  protected readonly weekday = weekdayVi;
  protected readonly mergeClasses = mergeClasses;
  private readonly settings = toSignal(from(liveQuery(() => this.settingsRepo.get())), {
    initialValue: DEFAULT_SETTINGS,
  });
  protected readonly showLunar = computed(() => this.settings().showLunarDate);
  protected readonly weekStartsOn = computed(() => this.settings().weekStartsOn);
  protected readonly allDayReminderTime = computed(() => this.settings().allDayReminderTime);
  protected readonly weekdays = computed(() =>
    this.settings().weekStartsOn === 1 ? WEEKDAYS : [WEEKDAYS[6], ...WEEKDAYS.slice(0, 6)],
  );

  protected readonly lunarMonthLabel = computed(() => {
    const lunar = gregorianToLunar(this.selected());
    const name = LUNAR_MONTH_NAMES[lunar.month - 1];
    return `Tháng ${name}${lunar.isLeapMonth ? ' nhuận' : ''} âm lịch`;
  });
  protected readonly week = computed(() => buildWeek(this.selected(), this.settings().weekStartsOn));
  protected readonly dayMonth = computed(() => buildMonthFor(this.selected(), this.settings().weekStartsOn));
  private readonly selectedLunar = computed(() => gregorianToLunar(this.selected()));
  protected readonly headerTitle = computed(() => {
    if (this.mode() === 'month') return `Tháng ${this.view().m}, ${this.view().y}`;
    if (this.mode() === 'week') return this.week().title;
    return `${this.weekday(this.selected())}, ${formatVi(this.selected())}`;
  });
  protected readonly headerMeta = computed(() => {
    if (this.mode() === 'month') return this.showLunar() ? this.lunarMonthLabel() : '';
    if (this.mode() === 'week') return this.showLunar() ? this.week().meta : this.week().monthLabel;
    if (!this.showLunar()) return '';
    const lunar = this.selectedLunar();
    return `${formatLunar(lunar)} âm lịch · năm ${canChiYear(lunar.year)}`;
  });

  protected readonly cells = computed(() => {
    const { y, m } = this.view();
    const start = startOfWeekFor(formatIso(y, m, 1), this.settings().weekStartsOn);
    return Array.from({ length: 42 }, (_, i) => {
      const date = addDays(start, i);
      const [cy, cm, day] = parseIso(date);
      const l = gregorianToLunar(date);
      return {
        date,
        day,
        inMonth: cy === y && cm === m,
        lunarLabel: l.day === 1 ? `${l.day}/${l.month}` : String(l.day),
      };
    });
  });
  private readonly range = computed(() => {
    if (this.mode() === 'week') return { from: this.week().start, to: this.week().end };
    if (this.mode() === 'day') return { from: this.dayMonth().days[0].date, to: this.dayMonth().days[41].date };
    return { from: this.cells()[0].date, to: this.cells()[41].date };
  });
  private readonly list = toSignal(
    toObservable(this.range).pipe(switchMap((r) => from(liveQuery(() => this.repo.occurrencesInRange(r.from, r.to))))),
    { initialValue: [] as Occurrence[] },
  );
  protected readonly byDate = computed(() => {
    const map = new Map<string, Occurrence[]>();
    for (const o of this.list()) map.set(o.date, [...(map.get(o.date) ?? []), o]);
    return map;
  });
  protected readonly selectedItems = computed(() => this.byDate().get(this.selected()) ?? []);
  protected readonly eventDates = computed(() => new Set(this.byDate().keys()));
  private readonly navDir = signal<-1 | 0 | 1>(0);
  protected readonly contentKey = computed(() => {
    if (this.mode() === 'month') return `month-${this.view().y}-${this.view().m}`;
    if (this.mode() === 'week') return `week-${this.week().start}`;
    return `day-${this.view().y}-${this.view().m}`;
  });
  protected readonly contentAnimClass = computed(() =>
    mergeClasses(
      'animate-in fill-mode-both fade-in duration-300 motion-reduce:animate-none',
      this.navDir() === -1
        ? 'slide-in-from-left-3'
        : this.navDir() === 1
          ? 'slide-in-from-right-3'
          : 'slide-in-from-bottom-2',
    ),
  );

  protected readonly dot = (category: EventCategory): string => eventCategoryStyle(category).dot;
  protected readonly chipClass = (category: EventCategory): string => eventCategoryStyle(category).badge;
  protected readonly categoryLabel = (category: EventCategory): string => eventCategoryStyle(category).label;

  protected cellClass(c: { date: string; inMonth: boolean }): string {
    return mergeClasses(
      'flex h-[54px] animate-in cursor-pointer flex-col items-center justify-center gap-px rounded-2xl px-1 text-center fade-in fill-mode-both zoom-in-95 duration-200 transition-colors motion-reduce:animate-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:h-24 md:items-stretch md:justify-start md:rounded-none md:border-b md:border-border md:px-1.5 md:py-1.5 md:text-left md:hover:bg-accent',
      !c.inMonth && 'opacity-35',
      c.date === this.selected() &&
        'bg-primary text-primary-foreground hover:bg-primary md:bg-accent md:text-foreground md:hover:bg-accent',
      c.date === this.clock.todayIso() && c.date !== this.selected() && 'text-primary md:font-semibold',
    );
  }

  protected cellDelay(index: number): number {
    return Math.min(index * 8, 160);
  }

  protected dayClass(c: { date: string }): string {
    return mergeClasses(
      'text-[0.9375rem] font-semibold md:text-sm',
      (c.date === this.clock.todayIso() || c.date === this.selected()) &&
        'md:inline-flex md:h-5 md:min-w-5 md:items-center md:justify-center md:rounded-full md:bg-primary md:px-1.5 md:text-primary-foreground',
    );
  }

  protected lunarClass(c: { date: string; lunarLabel: string }): string {
    return mergeClasses(
      'text-[0.625rem] md:text-[0.6875rem]',
      c.date === this.selected() ? 'text-primary-foreground/75 md:text-muted-foreground' : 'text-muted-foreground',
      c.lunarLabel.includes('/') && 'font-bold text-event-memorial-ink',
    );
  }

  protected cellAriaLabel(c: { date: string }): string {
    const lunar = this.showLunar() ? `, ${formatLunar(gregorianToLunar(c.date))} âm` : '';
    const count = this.byDate().get(c.date)?.length ?? 0;
    return `${this.weekday(c.date)}, ${formatVi(c.date)}${lunar}, ${count} sự kiện`;
  }

  protected modeButtonClass(view: CalendarView, extra = ''): string {
    return mergeClasses(
      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
      this.mode() === view ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      extra,
    );
  }

  protected setMode(view: CalendarView): void {
    this.mode.set(view);
    this.navDir.set(0);
    const [y, m] = parseIso(this.selected());
    this.view.set({ y, m });
  }

  protected async setShowLunar(checked: boolean): Promise<void> {
    try {
      await this.settingsRepo.update({ showLunarDate: checked });
    } catch {
      this.sonner.error('Không lưu được cài đặt hiển thị ngày âm.');
    }
  }

  protected select(date: string): void {
    const previous = this.selected();
    if (date !== previous) this.navDir.set(date > previous ? 1 : -1);
    this.selected.set(date);
    const [sy, sm] = parseIso(date);
    const { y, m } = this.view();
    if (sy !== y || sm !== m) {
      this.view.set({ y: sy, m: sm });
    }
  }

  protected shift(delta: number): void {
    this.navDir.set(delta > 0 ? 1 : -1);
    if (this.mode() === 'day') {
      const next = addDays(this.selected(), delta);
      const [y, m] = parseIso(next);
      this.view.set({ y, m });
      this.selected.set(next);
      return;
    }
    if (this.mode() === 'week') {
      const next = addDays(this.selected(), delta * 7);
      const [y, m] = parseIso(next);
      this.view.set({ y, m });
      this.selected.set(next);
      return;
    }
    const { y, m } = this.view();
    const idx = y * 12 + (m - 1) + delta;
    const ny = Math.floor(idx / 12),
      nm = (idx % 12) + 1;
    const current = this.selected();
    const [cy, cm, cd] = parseIso(current);
    this.view.set({ y: ny, m: nm });
    if (cy === y && cm === m) {
      this.selected.set(formatIso(ny, nm, Math.min(cd, daysInMonth(ny, nm))));
      return;
    }
    this.selected.set(formatIso(ny, nm, 1));
  }

  protected shiftDayMonth(delta: number): void {
    this.navDir.set(delta > 0 ? 1 : -1);
    const [y, m, d] = parseIso(this.selected());
    const idx = y * 12 + (m - 1) + delta;
    const ny = Math.floor(idx / 12);
    const nm = (idx % 12) + 1;
    this.view.set({ y: ny, m: nm });
    this.selected.set(formatIso(ny, nm, Math.min(d, daysInMonth(ny, nm))));
  }

  protected goToday(): void {
    this.navDir.set(0);
    const t = this.clock.todayIso();
    const [y, m] = parseIso(t);
    this.view.set({ y, m });
    this.selected.set(t);
  }
}
