import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { Clock } from '@core/data/clock';
import { EventRepository } from '@core/data/event.repository';
import { addDays } from '@core/domain/date';
import { formatLunar, gregorianToLunar } from '@core/domain/lunar';
import type { Occurrence } from '@core/domain/models';
import { AppIcon } from '@shared/ui/icon';
import { EventBadge } from '@shared/ui/event-badge';
import { formatVi, formatViShort, weekdayVi } from '@shared/utils/format';

@Component({
  selector: 'app-today-page',
  imports: [RouterLink, AppIcon, EventBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
      <header class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm text-muted-foreground">{{ weekday }}</p>
          <h1 class="text-2xl font-bold tracking-tight md:text-3xl">{{ date }}</h1>
          <p class="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <app-icon name="moon" [size]="16" /> Âm lịch: {{ lunar }}
          </p>
        </div>
        <a
          routerLink="/events/new"
          class="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground md:h-9"
        >
          <app-icon name="plus" [size]="16" /> Thêm sự kiện
        </a>
      </header>

      @if (occurrences() === null) {
        <div class="grid gap-3" aria-busy="true" aria-label="Đang tải">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-16 animate-pulse rounded-xl bg-muted"></div>
          }
        </div>
      } @else if (isEmpty()) {
        <section class="grid place-items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <h2 class="text-lg font-semibold">Hôm nay thảnh thơi</h2>
          <p class="max-w-sm text-sm text-muted-foreground">
            Chưa có sự kiện nào trong 7 ngày tới. Thêm ngày giỗ, sinh nhật hay lịch hẹn để được nhắc đúng lúc.
          </p>
          <a
            routerLink="/events/new"
            class="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground md:h-9"
            >Thêm sự kiện đầu tiên</a
          >
        </section>
      } @else {
        @if (next(); as n) {
          <section class="rounded-xl bg-primary p-5 text-primary-foreground">
            <p class="text-xs font-semibold tracking-wider opacity-85">SỰ KIỆN TIẾP THEO</p>
            <h2 class="mt-1 text-xl font-bold">{{ n.title }}</h2>
            <p class="text-sm opacity-90">{{ n.startTime }} · {{ lunarOf(n) }} âm lịch</p>
          </section>
        }
        <section class="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div class="rounded-xl border border-border bg-card p-4">
            <h2 class="mb-2 font-semibold">Lịch trình hôm nay</h2>
            @for (o of todayItems(); track o.occurrenceKey) {
              <div class="flex items-center gap-3 border-t border-border py-3 first:border-0">
                <span class="w-14 text-sm font-semibold text-muted-foreground">{{
                  o.isAllDay ? 'Cả ngày' : o.startTime
                }}</span>
                <span class="flex-1 font-medium">{{ o.title }}</span>
                <app-event-badge [category]="o.category" />
              </div>
            } @empty {
              <p class="py-3 text-sm text-muted-foreground">Không có sự kiện hôm nay.</p>
            }
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <h2 class="mb-2 font-semibold">7 ngày tới</h2>
            @for (o of upcoming(); track o.occurrenceKey) {
              <div class="flex items-center gap-3 border-t border-border py-2.5 first:border-0">
                <span class="w-12 rounded-md bg-muted px-1.5 py-0.5 text-center text-xs font-semibold">{{
                  short(o.date)
                }}</span>
                <span class="flex-1 text-sm font-medium">{{ o.title }}</span>
              </div>
            } @empty {
              <p class="py-3 text-sm text-muted-foreground">Chưa có sự kiện sắp tới.</p>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class TodayPage {
  private readonly repo = inject(EventRepository);
  private readonly clock = inject(Clock);
  private readonly today = this.clock.todayIso();
  protected readonly weekday = weekdayVi(this.today);
  protected readonly date = formatVi(this.today);
  protected readonly lunar = formatLunar(gregorianToLunar(this.today), true);
  /** `null` = đang tải. liveQuery tự cập nhật khi dữ liệu thay đổi. */
  protected readonly occurrences = toSignal<Occurrence[] | null>(
    from(liveQuery(() => this.repo.occurrencesInRange(this.today, addDays(this.today, 7)))),
    { initialValue: null },
  );
  protected readonly isEmpty = computed(() => this.occurrences()?.length === 0);
  protected readonly todayItems = computed(() => (this.occurrences() ?? []).filter((o) => o.date === this.today));
  protected readonly upcoming = computed(() => (this.occurrences() ?? []).filter((o) => o.date > this.today));
  protected readonly next = computed(
    () => this.todayItems().find((o) => !o.isAllDay && (o.startTime ?? '') >= this.clock.nowTime()) ?? null,
  );
  protected short = formatViShort;
  protected lunarOf = (o: Occurrence) => formatLunar(gregorianToLunar(o.date));
}
