import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EventCategory, Occurrence } from '@core/domain/models';
import { ZardBadgeComponent } from '@shared/components/badge';
import { EventBadge } from '@shared/ui/event-badge';
import { eventCategoryStyle } from '@shared/ui/event-category';
import { AppIcon } from '@shared/ui/icon';
import { cn } from '@shared/utils/cn';

@Component({
  selector: 'app-today-timeline',
  imports: [RouterLink, AppIcon, EventBadge, ZardBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="flex flex-col">
      @for (o of items(); track o.occurrenceKey; let last = $last; let i = $index) {
        <li
          class="flex animate-in gap-3 duration-250 fill-mode-both fade-in slide-in-from-left-2 motion-reduce:animate-none"
          [style.animation-delay.ms]="(i < 6 ? i : 5) * 35"
        >
          <span class="w-14 shrink-0 pt-3 text-right text-xs font-semibold text-muted-foreground">
            {{ o.isAllDay ? 'Cả ngày' : o.startTime }}
          </span>
          <span class="relative flex w-3 shrink-0 justify-center" aria-hidden="true">
            <span [class]="cn('mt-3.5 size-2.5 rounded-full', dot(o.category))"></span>
            @if (!last) {
              <span class="absolute top-6 bottom-0 w-px bg-border"></span>
            }
          </span>
          <a
            [routerLink]="['/events', o.eventId]"
            [class]="rowClass(o.category)"
            [attr.aria-label]="'Xem chi tiết ' + o.title"
          >
            <span class="flex flex-wrap items-center justify-between gap-2">
              <b class="min-w-0">{{ o.title }}</b>
              <app-event-badge [category]="o.category" />
            </span>
            <span class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              @if (o.location) {
                <span class="inline-flex min-w-0 items-center gap-1">
                  <app-icon name="pin" [size]="12" />
                  <span class="truncate">{{ o.location }}</span>
                </span>
              }
              @if (reminderLabel(o); as label) {
                <span class="inline-flex items-center gap-1">
                  <app-icon name="bell" [size]="12" />
                  {{ label }}
                </span>
              }
              @if (failedKeys().has(o.occurrenceKey)) {
                <z-badge zType="destructive" class="gap-1">
                  <app-icon name="alertTriangle" [size]="12" />
                  Chưa có nhắc
                </z-badge>
              }
            </span>
          </a>
        </li>
      } @empty {
        <li class="py-3 text-sm text-muted-foreground">Không có sự kiện hôm nay.</li>
      }
    </ul>
  `,
})
export class TodayTimeline {
  readonly items = input.required<Occurrence[]>();
  readonly failedKeys = input<ReadonlySet<string>>(new Set());

  protected readonly cn = cn;
  protected readonly dot = (category: EventCategory): string => eventCategoryStyle(category).dot;

  protected rowClass(category: EventCategory): string {
    return cn(
      'mb-3 flex-1 rounded-xl border border-transparent px-3 py-3 transition-[translate,background-color] duration-200 hover:translate-x-0.5 hover:bg-muted motion-reduce:transition-none motion-reduce:hover:[translate:none]',
      eventCategoryStyle(category).soft,
    );
  }

  protected reminderLabel(occurrence: Occurrence): string | null {
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
