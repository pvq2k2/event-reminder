import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Clock } from '@core/data/clock';
import { EventRepository } from '@core/data/event.repository';
import { addDays, daysInMonth, formatIso, parseIso, startOfWeekMonday } from '@core/domain/date';
import { gregorianToLunar } from '@core/domain/lunar';
import type { EventCategory, Occurrence } from '@core/domain/models';
import { ZardBadgeComponent } from '@shared/components/badge';
import { AppIconComponent } from '@shared/ui';
import { eventCategoryStyle, formatVi, mergeClasses, weekdayVi } from '@shared/utils';
import { liveQuery } from 'dexie';
import { from, switchMap } from 'rxjs';

@Component({
  selector: 'app-calendar-page',
  imports: [AppIconComponent, ZardBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Host phải block + cao full để khung header-scroll bên trong tính đúng.
  host: { class: 'block h-full min-h-0' },
  template: `
    <div class="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
      <div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
        <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section class="rounded-xl border border-border bg-card">
            <header class="flex items-center justify-between gap-2 p-4">
              <h1 class="text-xl font-bold tracking-tight">Tháng {{ view().m }}, {{ view().y }}</h1>
              <div class="flex gap-2">
                <button
                  type="button"
                  (click)="shift(-1)"
                  aria-label="Tháng trước"
                  class="grid size-11 place-items-center rounded-md border border-input md:size-9"
                >
                  <app-icon name="chevronLeft" />
                </button>
                <button
                  type="button"
                  (click)="goToday()"
                  class="h-11 rounded-md border border-input px-3 text-sm font-medium md:h-9"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  (click)="shift(1)"
                  aria-label="Tháng sau"
                  class="grid size-11 place-items-center rounded-md border border-input md:size-9"
                >
                  <app-icon name="chevronRight" />
                </button>
              </div>
            </header>
            <div class="grid grid-cols-7 bg-muted text-center text-xs font-semibold text-muted-foreground">
              @for (d of weekdays; track d) {
                <div class="py-2">{{ d }}</div>
              }
            </div>
            <div class="grid grid-cols-7">
              @for (c of cells(); track c.date) {
                <button type="button" (click)="selected.set(c.date)" [attr.aria-label]="c.date" [class]="cellClass(c)">
                  <span class="flex items-center justify-between text-sm"
                    ><b>{{ c.day }}</b
                    ><span
                      class="text-[0.625rem] text-muted-foreground"
                      [class.font-bold]="c.lunarLabel.includes('/')"
                      >{{ c.lunarLabel }}</span
                    ></span
                  >
                  <span class="mt-1 flex gap-0.5 md:hidden">
                    @for (o of byDate().get(c.date)?.slice(0, 3); track o.occurrenceKey) {
                      <i class="size-1.5 rounded-full bg-primary"></i>
                    }
                  </span>
                  <span class="mt-1 hidden flex-col gap-0.5 md:flex">
                    @for (o of byDate().get(c.date)?.slice(0, 2); track o.occurrenceKey) {
                      <i
                        class="truncate rounded bg-primary/15 px-1 text-left text-[0.6875rem] text-primary not-italic"
                        >{{ o.title }}</i
                      >
                    }
                  </span>
                </button>
              }
            </div>
          </section>

          <aside class="rounded-xl border border-border bg-card p-4">
            <h2 class="font-semibold">{{ weekday(selected()) }}, {{ full(selected()) }}</h2>
            @for (o of selectedItems(); track o.occurrenceKey) {
              <div class="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted p-3">
                <div>
                  <b class="block text-sm">{{ o.title }}</b
                  ><span class="text-xs text-muted-foreground">{{ o.isAllDay ? 'Cả ngày' : o.startTime }}</span>
                </div>
                <z-badge [class]="badgeClass(o.category)">{{ categoryLabel(o.category) }}</z-badge>
              </div>
            } @empty {
              <p class="mt-3 text-sm text-muted-foreground">Không có sự kiện trong ngày này.</p>
            }
          </aside>
        </div>
      </div>
    </div>
  `,
})
export class CalendarPage {
  private readonly repo = inject(EventRepository);
  private readonly clock = inject(Clock);
  protected readonly weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  protected readonly selected = signal(this.clock.todayIso());
  protected readonly view = signal((([y, m]) => ({ y, m }))(parseIso(this.clock.todayIso())));
  protected readonly weekday = weekdayVi;
  protected readonly full = formatVi;
  protected readonly categoryLabel = (category: EventCategory): string => eventCategoryStyle(category).label;
  protected readonly badgeClass = (category: EventCategory): string => eventCategoryStyle(category).badge;

  protected readonly cells = computed(() => {
    const { y, m } = this.view();
    const start = startOfWeekMonday(formatIso(y, m, 1));
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
  private readonly range = computed(() => ({ from: this.cells()[0].date, to: this.cells()[41].date }));
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

  protected cellClass(c: { date: string; inMonth: boolean }): string {
    return mergeClasses(
      'min-h-16 border-t border-border p-1.5 text-left align-top transition-colors hover:bg-accent md:min-h-24',
      !c.inMonth && 'opacity-40',
      c.date === this.selected() && 'bg-accent ring-1 ring-primary ring-inset',
      c.date === this.clock.todayIso() && 'font-semibold',
    );
  }
  protected shift(delta: number): void {
    const { y, m } = this.view();
    const idx = y * 12 + (m - 1) + delta;
    const ny = Math.floor(idx / 12),
      nm = (idx % 12) + 1;
    this.view.set({ y: ny, m: nm });
    this.selected.set(formatIso(ny, nm, Math.min(parseIso(this.selected())[2], daysInMonth(ny, nm)))); // không làm sai ngày đang chọn
  }
  protected goToday(): void {
    const t = this.clock.todayIso();
    const [y, m] = parseIso(t);
    this.view.set({ y, m });
    this.selected.set(t);
  }
}
