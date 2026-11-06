import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatLunar, gregorianToLunar } from '@core/domain/lunar';
import type { EventCategory, Occurrence } from '@core/domain/models';
import { AppIconComponent } from '@shared/ui';
import { eventCategoryStyle, formatViShort, mergeClasses, weekdayVi } from '@shared/utils';

@Component({
  selector: 'app-calendar-day-panel',
  imports: [AppIconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block mt-3 lg:mt-0 lg:sticky lg:top-0' },
  template: `
    <section class="rounded-2xl border border-border bg-card px-4 py-2.5 md:p-5" aria-live="polite">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-[0.9375rem] font-semibold md:text-base">{{ weekday(date()) }}, {{ short(date()) }}</h2>
        @if (showLunar()) {
          <span
            class="inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {{ selectedLunar() }} âm
          </span>
        }
      </div>

      <div class="my-3 hidden h-px bg-border md:block"></div>

      @for (o of items(); track o.occurrenceKey) {
        <a
          [routerLink]="['/events', o.eventId]"
          [attr.aria-label]="'Xem chi tiết ' + o.title"
          [class]="eventCardClass(o.category)"
        >
          <span class="w-12 shrink-0 text-[0.6875rem] font-semibold text-muted-foreground">
            {{ timeLabel(o) }}
          </span>
          <i [class]="mergeClasses('h-8.5 w-1 shrink-0 rounded-full', dot(o.category))"></i>
          <span class="min-w-0 flex-1">
            <b class="block truncate text-sm">{{ o.title }}</b>
            <span class="mt-0.5 block truncate text-xs text-muted-foreground">{{ eventMeta(o) }}</span>
          </span>
          <app-icon name="chevronRight" [size]="16" class="text-muted-foreground md:hidden" />
        </a>
      } @empty {
        <p class="py-3 text-sm text-muted-foreground md:py-6 md:text-center">Không có sự kiện trong ngày này.</p>
      }

      <a
        routerLink="/events/new"
        [queryParams]="{ date: date() }"
        class="mt-2 hidden h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:flex"
      >
        <app-icon name="plus" [size]="16" />
        Thêm vào ngày này
      </a>
    </section>
  `,
})
export class CalendarDayPanel {
  readonly date = input.required<string>();
  readonly items = input.required<readonly Occurrence[]>();
  readonly showLunar = input(true);

  protected readonly weekday = weekdayVi;
  protected readonly short = formatViShort;
  protected readonly mergeClasses = mergeClasses;
  protected readonly selectedLunar = computed(() => formatLunar(gregorianToLunar(this.date())));

  protected readonly dot = (category: EventCategory): string => eventCategoryStyle(category).dot;
  protected readonly categoryLabel = (category: EventCategory): string => eventCategoryStyle(category).label;

  protected eventCardClass(category: EventCategory): string {
    return mergeClasses(
      'flex items-center gap-3 rounded-md py-2.5 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:mb-2 md:rounded-lg md:p-3 md:py-3',
      eventCategoryStyle(category).card,
    );
  }

  protected timeLabel(o: Occurrence): string {
    return o.isAllDay ? 'Cả ngày' : (o.startTime ?? '');
  }

  protected eventMeta(o: Occurrence): string {
    const parts: string[] = [];
    if (o.location) parts.push(o.location);
    const reminder = this.reminderLabel(o);
    if (reminder) parts.push(reminder);
    return parts.join(' · ') || this.categoryLabel(o.category);
  }

  private reminderLabel(occurrence: Occurrence): string | null {
    if (!occurrence.reminderOffsets.length) return null;
    const offset = Math.min(...occurrence.reminderOffsets);
    if (offset === 0) return 'Nhắc đúng giờ';
    if (offset >= 1440) {
      const days = Math.floor(offset / 1440);
      return `Nhắc trước ${days} ngày`;
    }
    return `Nhắc trước ${offset} phút`;
  }
}
