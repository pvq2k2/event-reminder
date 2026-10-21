import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EventCategory, Occurrence } from '@core/domain/models';
import { ZardCardImports } from '@shared/components/card';
import { AppIconComponent } from '@shared/ui';
import { eventCategoryStyle, formatRelativeDay, formatViShort, mergeClasses } from '@shared/utils';

import type { MonthDay } from './today.utils';

export interface TodayMonthDay extends MonthDay {
  dotClass: string | null;
}

@Component({
  selector: 'app-today-sidebar',
  imports: [AppIconComponent, RouterLink, ...ZardCardImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hidden md:block' },
  template: `
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
      <z-card>
        <z-card-header>
          <z-card-title [zTitle]="monthLabel()" />
          <z-card-action>
            <a routerLink="/calendar" class="group inline-flex items-center gap-1 text-xs font-medium text-primary">
              Mở lịch
              <app-icon
                name="chevronRight"
                [size]="14"
                class="transition-[translate] duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-none"
              />
            </a>
          </z-card-action>
        </z-card-header>
        <z-card-content>
          <div class="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
            @for (label of weekdays(); track label) {
              <span class="py-1">{{ label }}</span>
            }
          </div>
          <div class="mt-1 grid grid-cols-7 gap-0.5">
            @for (d of monthDays(); track d.date) {
              <span
                [class]="
                  mergeClasses(
                    'relative flex h-8 flex-col items-center justify-center rounded-md text-xs',
                    !d.inMonth && 'opacity-40',
                    d.isToday && 'bg-primary font-bold text-primary-foreground'
                  )
                "
                [attr.aria-label]="d.date"
              >
                {{ d.day }}
                @if (d.dotClass) {
                  <span
                    [class]="mergeClasses('absolute bottom-0.5 size-1 rounded-full', d.dotClass)"
                    aria-hidden="true"
                  ></span>
                }
              </span>
            }
          </div>
        </z-card-content>
      </z-card>

      <z-card>
        <z-card-header>
          <z-card-title zTitle="7 ngày tới" />
        </z-card-header>
        <z-card-content>
          @for (o of upcoming(); track o.occurrenceKey) {
            <a
              [routerLink]="['/events', o.eventId]"
              class="flex items-center gap-3 rounded-md px-1 py-2 transition-[translate,background-color] duration-200 hover:translate-x-0.5 hover:bg-muted motion-reduce:transition-none motion-reduce:hover:translate-none"
              [attr.aria-label]="'Xem chi tiết ' + o.title"
            >
              <span
                [class]="
                  mergeClasses(
                    'inline-flex w-12 shrink-0 justify-center rounded-md py-0.5 text-xs font-semibold',
                    badge(o.category)
                  )
                "
              >
                {{ short(o.date) }}
              </span>
              <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ o.title }}</span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ relative(o.date) }}</span>
            </a>
          } @empty {
            <p class="py-3 text-sm text-muted-foreground">Chưa có sự kiện sắp tới.</p>
          }
        </z-card-content>
      </z-card>
    </div>
  `,
})
export class TodaySidebar {
  readonly today = input.required<string>();
  readonly monthLabel = input('');
  readonly monthDays = input.required<TodayMonthDay[]>();
  readonly upcoming = input.required<Occurrence[]>();
  readonly weekStartsOn = input<0 | 1>(1);

  protected readonly weekdays = computed(() =>
    this.weekStartsOn() === 1 ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  );
  protected readonly mergeClasses = mergeClasses;
  protected readonly short = formatViShort;
  protected readonly relative = (iso: string): string => formatRelativeDay(iso, this.today());
  protected readonly badge = (category: EventCategory): string => eventCategoryStyle(category).badge;
}
