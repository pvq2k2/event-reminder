import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ISODate } from '@core/domain/date';
import { parseIso } from '@core/domain/date';
import { ZardButtonComponent } from '@shared/components/button';
import { AppIconComponent } from '@shared/ui';
import { formatVi, weekdayVi } from '@shared/utils';

@Component({
  selector: 'app-today-header',
  imports: [AppIconComponent, RouterLink, ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block shrink-0' },
  template: `
    <header class="shrink-0 p-4 pb-2 md:p-6 md:pb-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="hidden md:block">
            <h1 class="text-2xl font-bold tracking-tight md:text-3xl">Hôm nay</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ weekday() }}, {{ fullDate() }}
              @if (showLunar()) {
                · {{ lunar() }} âm lịch · năm {{ canChi() }}
              }
            </p>
          </div>

          <div class="md:hidden">
            <p class="text-sm text-muted-foreground">{{ greeting() }}</p>
            <div class="mt-1 flex items-baseline gap-2.5">
              <span class="text-4xl leading-none font-bold tracking-tight">{{ day() }}</span>
              <span class="text-sm leading-snug font-semibold">
                {{ weekday() }}<br />
                <span class="font-normal text-muted-foreground">Tháng {{ month() }}, {{ year() }}</span>
              </span>
            </div>
            @if (showLunar()) {
              <p
                class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-event-memorial/20 px-3 py-1 text-xs font-medium text-event-memorial-ink"
              >
                <app-icon name="moon" [size]="14" />
                {{ lunar() }} âm lịch · năm {{ canChi() }}
              </p>
            }
          </div>
        </div>

        <a
          z-button
          zSize="lg"
          routerLink="/events/new"
          aria-label="Thêm sự kiện"
          class="h-11 w-11 shrink-0 gap-2 px-0 md:h-9 md:w-auto md:px-3"
        >
          <app-icon name="plus" [size]="18" />
          <span class="hidden md:inline">Thêm sự kiện</span>
        </a>
      </div>
    </header>
  `,
})
export class TodayHeader {
  readonly today = input.required<ISODate>();
  readonly lunar = input('');
  readonly canChi = input('');
  readonly greeting = input('');
  readonly showLunar = input(true);

  protected readonly weekday = computed(() => weekdayVi(this.today()));
  protected readonly fullDate = computed(() => formatVi(this.today()));
  protected readonly day = computed(() => parseIso(this.today())[2]);
  protected readonly month = computed(() => parseIso(this.today())[1]);
  protected readonly year = computed(() => parseIso(this.today())[0]);
}
