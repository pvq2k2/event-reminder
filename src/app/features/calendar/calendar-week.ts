import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Clock } from '@core/data/clock';
import { formatLunar, gregorianToLunar } from '@core/domain/lunar';
import type { EventCategory, Occurrence } from '@core/domain/models';
import { eventCategoryStyle, formatVi, mergeClasses, weekdayShortVi, weekdayVi } from '@shared/utils';

import type { TimedEventBlock, WeekDayCell, WeekModel } from './calendar.utils';
import { layoutTimedEvents, parseTimeMinutes, WEEK_END_HOUR, WEEK_HOURS, WEEK_START_HOUR } from './calendar.utils';
import { CalendarDayPanel } from './calendar-day-panel';

const RANGE_MINUTES = (WEEK_END_HOUR - WEEK_START_HOUR) * 60;
const INITIAL_SCROLL_HOUR = 7;

@Component({
  selector: 'app-calendar-week',
  imports: [CalendarDayPanel, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <section class="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div [class]="gridClass()" [style.paddingRight.px]="scrollbarWidth()">
        <div></div>
        @for (day of week().days; track day.date) {
          <button
            type="button"
            (click)="selectDate.emit(day.date)"
            [attr.aria-label]="dayAria(day)"
            [attr.aria-pressed]="day.date === selected()"
            [class]="dayHeadClass(day.date)"
          >
            <span class="text-[0.625rem] font-semibold text-muted-foreground md:hidden">{{
              weekdayShort(day.date)
            }}</span>
            <span class="hidden text-xs font-semibold text-muted-foreground md:inline">{{ weekday(day.date) }}</span>
            <span [class]="dayNumberClass(day.date)">{{ day.day }}</span>
            @if (showLunar()) {
              <span
                [class]="
                  mergeClasses(
                    'text-[0.5625rem] md:text-[0.6875rem]',
                    day.date === selected() ? 'text-muted-foreground' : 'text-muted-foreground',
                    day.lunarLabel.includes('/') && 'font-bold text-event-memorial-ink'
                  )
                "
              >
                {{ day.lunarLabel }}
              </span>
            }
          </button>
        }
      </div>

      <div [class]="gridClass('border-t border-border')" [style.paddingRight.px]="scrollbarWidth()">
        <span
          class="flex items-center justify-end pt-1 pr-1.5 text-end text-[0.5625rem] font-medium text-muted-foreground md:text-[0.6875rem]"
        >
          Cả ngày
        </span>
        @for (day of week().days; track day.date) {
          <div [class]="dayColumnClass(day.date, 'min-h-8 p-0.5 md:min-h-9 md:p-1')">
            @for (o of allDayFor(day.date); track o.occurrenceKey) {
              <a
                [routerLink]="['/events', o.eventId]"
                [attr.aria-label]="'Xem chi tiết ' + o.title"
                [class]="allDayClass(o.category)"
                >{{ o.title }}</a
              >
            }
          </div>
        }
      </div>

      <div
        #timeScroll
        class="scrollbar-thin h-69.75 overflow-y-auto overscroll-contain md:h-126"
        role="region"
        aria-label="Lưới giờ trong tuần"
        tabindex="0"
      >
        <div [class]="gridClass('h-114 border-t border-border md:h-204')">
          <div class="relative">
            <div class="grid h-full" [style.gridTemplateRows]="hourRows">
              @for (hour of hours; track hour.value) {
                <span
                  class="flex items-center justify-end pr-1.5 text-right text-[0.5rem] leading-none text-muted-foreground md:text-[0.6875rem]"
                >
                  {{ hour.label }}:00
                </span>
              }
            </div>
          </div>

          <div class="relative col-span-7 h-full overflow-hidden">
            <div class="pointer-events-none absolute inset-0 grid" [style.gridTemplateRows]="hourRows">
              @for (hour of hours; track hour.value) {
                <div class="border-b border-border"></div>
              }
            </div>
            <div class="absolute inset-0 grid grid-cols-7">
              @for (day of week().days; track day.date) {
                <div [class]="dayColumnClass(day.date, '')" (click)="selectDate.emit(day.date)">
                  @for (block of timedFor(day.date); track block.occurrence.occurrenceKey) {
                    <a
                      [routerLink]="['/events', block.occurrence.eventId]"
                      [attr.aria-label]="'Xem chi tiết ' + block.occurrence.title"
                      [class]="timedClass(block.occurrence.category)"
                      [style.top.%]="block.top"
                      [style.left]="blockLeft(block)"
                      [style.width]="blockWidth(block)"
                    >
                      <b class="block truncate">{{ block.occurrence.title }}</b>
                      <span class="hidden truncate text-[0.625rem] font-normal opacity-75 md:block">{{
                        block.time
                      }}</span>
                    </a>
                  }
                  @if (day.date === today() && nowPercent() !== null) {
                    <div class="pointer-events-none absolute inset-x-0 z-10" [style.top.%]="nowPercent() ?? 0">
                      <div class="relative border-t-2 border-primary">
                        <i class="absolute -top-1 left-0 size-2 rounded-full bg-primary"></i>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="mt-3 lg:hidden">
      <app-calendar-day-panel [date]="selected()" [items]="selectedItems()" [showLunar]="showLunar()" />
    </div>
  `,
})
export class CalendarWeek {
  private readonly clock = inject(Clock);
  private readonly destroyRef = inject(DestroyRef);
  private readonly timeScroll = viewChild<ElementRef<HTMLElement>>('timeScroll');
  readonly scrollbarWidth = signal(0);

  constructor() {
    afterNextRender(() => {
      const element = this.timeScroll()?.nativeElement;
      if (!element) return;

      const measure = () => this.scrollbarWidth.set(element.offsetWidth - element.clientWidth);
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }

      element.scrollTop = (element.scrollHeight / this.hours.length) * INITIAL_SCROLL_HOUR;
    });
  }

  readonly week = input.required<WeekModel>();
  readonly itemsByDate = input.required<ReadonlyMap<string, readonly Occurrence[]>>();
  readonly selected = input.required<string>();
  readonly today = input.required<string>();
  readonly showLunar = input(true);
  readonly selectDate = output<string>();

  protected readonly mergeClasses = mergeClasses;
  protected readonly weekday = weekdayVi;
  protected readonly weekdayShort = weekdayShortVi;
  protected readonly hours = WEEK_HOURS.map((value) => ({ value, label: String(value).padStart(2, '0') }));
  protected readonly hourRows = `repeat(${WEEK_HOURS.length}, minmax(0, 1fr))`;

  protected readonly allDayByDate = computed(() => {
    const map = new Map<string, readonly Occurrence[]>();
    for (const day of this.week().days) {
      map.set(
        day.date,
        (this.itemsByDate().get(day.date) ?? []).filter((o) => o.isAllDay),
      );
    }
    return map;
  });

  protected readonly timedByDate = computed(() => {
    const map = new Map<string, readonly TimedEventBlock[]>();
    for (const day of this.week().days) {
      map.set(day.date, layoutTimedEvents(this.itemsByDate().get(day.date) ?? []));
    }
    return map;
  });

  protected readonly selectedItems = computed(() => this.itemsByDate().get(this.selected()) ?? []);

  protected readonly nowPercent = computed(() => {
    if (!this.week().days.some((d) => d.date === this.today())) return null;
    const minutes = parseTimeMinutes(this.clock.nowTime());
    if (minutes === null) return null;
    const start = WEEK_START_HOUR * 60;
    if (minutes < start || minutes > WEEK_END_HOUR * 60) return null;
    return ((minutes - start) / RANGE_MINUTES) * 100;
  });

  protected gridClass(extra = ''): string {
    return mergeClasses(
      'grid grid-cols-[2.125rem_repeat(7,minmax(0,1fr))] md:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]',
      extra,
    );
  }

  protected dayAria(day: WeekDayCell): string {
    const lunar = this.showLunar() ? `, ${formatLunar(gregorianToLunar(day.date))} âm` : '';
    const count = this.itemsByDate().get(day.date)?.length ?? 0;
    return `${this.weekday(day.date)}, ${formatVi(day.date)}${lunar}, ${count} sự kiện`;
  }

  protected dayHeadClass(date: string): string {
    return mergeClasses(
      'flex flex-col items-center gap-0.5 cursor-pointer border-l border-border py-1.5 text-center transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
      date === this.selected() && 'bg-accent',
    );
  }

  protected dayNumberClass(date: string): string {
    return mergeClasses(
      'inline-flex size-7 items-center justify-center rounded-full text-sm font-bold',
      date === this.selected()
        ? 'bg-primary text-primary-foreground'
        : date === this.today()
          ? 'text-primary'
          : 'text-foreground',
    );
  }

  protected dayColumnClass(date: string, extra: string): string {
    return mergeClasses(
      'relative border-l border-border cursor-pointer',
      date === this.selected() && 'bg-accent/40',
      date === this.today() && date !== this.selected() && 'bg-primary/5',
      extra,
    );
  }

  protected allDayFor(date: string): readonly Occurrence[] {
    return this.allDayByDate().get(date) ?? [];
  }

  protected timedFor(date: string): readonly TimedEventBlock[] {
    return this.timedByDate().get(date) ?? [];
  }

  protected allDayClass(category: EventCategory): string {
    return mergeClasses(
      'mt-0.5 block truncate rounded-md px-1 py-px text-left text-[0.5625rem] font-semibold md:px-1.5 md:text-[0.6875rem]',
      eventCategoryStyle(category).badge,
    );
  }

  protected timedClass(category: EventCategory): string {
    return mergeClasses(
      'absolute min-h-4 overflow-hidden rounded-md p-1 text-[0.5625rem] leading-tight font-semibold transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none md:p-1.5 md:text-[0.6875rem]',
      eventCategoryStyle(category).soft,
    );
  }

  protected blockLeft(block: TimedEventBlock): string {
    return `calc(${block.left}% + 1px)`;
  }

  protected blockWidth(block: TimedEventBlock): string {
    return `calc(${block.width}% - 2px)`;
  }
}
