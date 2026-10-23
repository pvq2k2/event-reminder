import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EventCategory, Occurrence } from '@core/domain/models';
import { ZardBadgeComponent } from '@shared/components/badge';
import { AppIconComponent } from '@shared/ui';
import { eventCategoryStyle, mergeClasses } from '@shared/utils';

@Component({
  selector: 'app-today-timeline',
  imports: [AppIconComponent, RouterLink, ZardBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="flex flex-col">
      @for (o of items(); track o.occurrenceKey; let last = $last; let i = $index) {
        <li
          class="flex animate-in gap-3 duration-250 fill-mode-both fade-in slide-in-from-left-2 motion-reduce:animate-none md:items-center md:border-b md:border-border md:py-3 md:last:border-b-0"
          [style.animation-delay.ms]="(i < 6 ? i : 5) * 35"
        >
          <span
            [class]="
              mergeClasses(
                'w-10 shrink-0 pt-3 text-right text-xs font-semibold md:w-14 md:self-center md:pt-0',
                timeClass(o.category)
              )
            "
          >
            {{ o.isAllDay ? 'Cả ngày' : o.startTime }}
          </span>
          <span class="relative flex w-3 shrink-0 justify-center md:hidden" aria-hidden="true">
            <span [class]="mergeClasses('mt-3.5 size-2.5 rounded-full', dot(o.category))"></span>
            @if (!last) {
              <span class="absolute top-6 bottom-0 w-0.5 bg-border"></span>
            }
          </span>
          <a
            [routerLink]="['/events', o.eventId]"
            [class]="rowClass(o.category)"
            [attr.aria-label]="'Xem chi tiết ' + o.title"
          >
            <span [class]="barClass(o.category)" aria-hidden="true"></span>
            <span class="min-w-0 flex-1">
              <b class="block">{{ o.title }}</b>
              <span class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span class="md:hidden">{{ categoryLabel(o.category) }}</span>
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
            </span>
            <span class="hidden shrink-0 md:inline-flex">
              <z-badge [class]="badgeClass(o.category)">{{ categoryLabel(o.category) }}</z-badge>
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

  private readonly timeInk: Record<EventCategory, string> = {
    work: 'md:text-event-work-ink',
    birthday: 'md:text-event-birthday-ink',
    memorial: 'md:text-event-memorial-ink',
    other: '',
  };

  protected readonly mergeClasses = mergeClasses;
  protected readonly dot = (category: EventCategory): string => eventCategoryStyle(category).dot;
  protected readonly categoryLabel = (category: EventCategory): string => eventCategoryStyle(category).label;
  protected readonly badgeClass = (category: EventCategory): string => eventCategoryStyle(category).badge;

  protected timeClass(category: EventCategory): string {
    return mergeClasses('text-muted-foreground', this.timeInk[category]);
  }

  protected barClass(category: EventCategory): string {
    return mergeClasses('hidden h-9 w-1 shrink-0 rounded-full md:block', this.dot(category));
  }

  protected rowClass(category: EventCategory): string {
    return mergeClasses(
      'mb-2.5 flex-1 rounded-xl border border-transparent px-3.5 py-3 transition-[translate,background-color] duration-200 hover:translate-x-0.5 hover:bg-muted motion-reduce:transition-none motion-reduce:hover:[translate:none]',
      eventCategoryStyle(category).soft,
      'md:mb-0 md:flex md:items-center md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:hover:translate-x-0 md:hover:bg-transparent',
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
