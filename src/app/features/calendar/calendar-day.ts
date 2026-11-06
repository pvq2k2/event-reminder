import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Clock } from '@core/data/clock';
import type { EventCategory, Occurrence } from '@core/domain/models';
import { eventCategoryStyle, mergeClasses } from '@shared/utils';

import type { TimedEventBlock } from './calendar.utils';
import { layoutTimedEvents, parseTimeMinutes, WEEK_END_HOUR, WEEK_HOURS, WEEK_START_HOUR } from './calendar.utils';

const RANGE_MINUTES = (WEEK_END_HOUR - WEEK_START_HOUR) * 60;
const INITIAL_SCROLL_HOUR = 7;

@Component({
  selector: 'app-calendar-day',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <section class="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div class="flex border-b border-border" [style.paddingRight.px]="scrollbarWidth()">
        <span
          class="flex w-8.5 shrink-0 items-center justify-end pt-1 pr-1.5 text-end text-[0.5625rem] font-medium text-muted-foreground md:w-14 md:text-[0.6875rem]"
        >
          Cả ngày
        </span>
        <div class="flex min-h-8 flex-1 flex-wrap content-center gap-1 p-1 md:min-h-9">
          @for (o of allDayItems(); track o.occurrenceKey) {
            <a
              [routerLink]="['/events', o.eventId]"
              [attr.aria-label]="'Xem chi tiết ' + o.title"
              [class]="allDayClass(o.category)"
              >{{ o.title }}</a
            >
          }
        </div>
      </div>

      <div
        #timeScroll
        class="scrollbar-thin h-69.75 overflow-y-auto overscroll-contain md:h-126"
        role="region"
        aria-label="Lưới giờ trong ngày"
        tabindex="0"
      >
        <div
          class="grid h-114 grid-cols-[2.125rem_minmax(0,1fr)] border-t border-border md:h-204 md:grid-cols-[3.5rem_minmax(0,1fr)]"
        >
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

          <div class="relative overflow-hidden border-l border-border">
            <div class="pointer-events-none absolute inset-0 grid" [style.gridTemplateRows]="hourRows">
              @for (hour of hours; track hour.value) {
                <div class="border-b border-border"></div>
              }
            </div>
            <div class="absolute inset-0">
              @for (block of timedItems(); track block.occurrence.occurrenceKey) {
                <a
                  [routerLink]="['/events', block.occurrence.eventId]"
                  [attr.aria-label]="'Xem chi tiết ' + block.occurrence.title"
                  [class]="timedClass(block.occurrence.category)"
                  [style.top.%]="block.top"
                  [style.left]="blockLeft(block)"
                  [style.width]="blockWidth(block)"
                >
                  <b class="block truncate">{{ block.occurrence.title }}</b>
                  <span class="block truncate text-[0.625rem] font-normal opacity-75">{{ block.time }}</span>
                </a>
              }
              @if (date() === today() && nowPercent() !== null) {
                <div class="pointer-events-none absolute inset-x-0 z-10" [style.top.%]="nowPercent() ?? 0">
                  <div class="relative border-t-2 border-primary">
                    <i class="absolute -top-1 left-0 size-2 rounded-full bg-primary"></i>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CalendarDay {
  private readonly clock = inject(Clock);
  private readonly destroyRef = inject(DestroyRef);
  private readonly timeScroll = viewChild<ElementRef<HTMLElement>>('timeScroll');
  protected readonly scrollbarWidth = signal(0);

  readonly date = input.required<string>();
  readonly items = input.required<readonly Occurrence[]>();
  readonly today = input.required<string>();

  protected readonly hours = WEEK_HOURS.map((value) => ({ value, label: String(value).padStart(2, '0') }));
  protected readonly hourRows = `repeat(${WEEK_HOURS.length}, minmax(0, 1fr))`;
  protected readonly allDayItems = computed(() => this.items().filter((item) => item.isAllDay));
  protected readonly timedItems = computed(() => layoutTimedEvents(this.items()));
  protected readonly nowPercent = computed(() => {
    const minutes = parseTimeMinutes(this.clock.nowTime());
    if (minutes === null) return null;
    const start = WEEK_START_HOUR * 60;
    if (minutes < start || minutes > WEEK_END_HOUR * 60) return null;
    return ((minutes - start) / RANGE_MINUTES) * 100;
  });

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

  protected allDayClass(category: EventCategory): string {
    return mergeClasses(
      'truncate rounded-md px-2 py-0.5 text-left text-[0.6875rem] font-semibold transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none md:text-xs',
      eventCategoryStyle(category).badge,
    );
  }

  protected timedClass(category: EventCategory): string {
    return mergeClasses(
      'absolute min-h-4 overflow-hidden rounded-md p-1 text-[0.625rem] leading-tight font-semibold transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none md:p-1.5 md:text-xs',
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
