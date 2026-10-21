import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Occurrence } from '@core/domain/models';
import { AppIconComponent } from '@shared/ui';

@Component({
  selector: 'app-today-next-card',
  imports: [AppIconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <a
      [routerLink]="['/events', next().eventId]"
      class="group block rounded-xl bg-primary p-5 text-primary-foreground transition-[translate,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-none"
      [attr.aria-label]="'Xem chi tiết ' + next().title"
    >
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-semibold tracking-wider uppercase opacity-85">Sự kiện tiếp theo</span>
        @if (countdown()) {
          <span class="text-2xl font-bold tracking-tight">{{ countdown() }}</span>
        }
      </div>
      <h2 class="mt-1 text-xl font-bold md:text-2xl">{{ next().title }}</h2>
      <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-90">
        <span class="inline-flex items-center gap-1.5">
          <app-icon name="today" [size]="14" />
          {{ next().isAllDay ? 'Cả ngày' : next().startTime }} · {{ relative() }}
        </span>
        @if (next().location) {
          <span class="inline-flex min-w-0 items-center gap-1.5">
            <app-icon name="pin" [size]="14" />
            <span class="truncate">{{ next().location }}</span>
          </span>
        }
        @if (showLunar()) {
          <span class="inline-flex items-center gap-1.5">
            <app-icon name="moon" [size]="14" />
            {{ lunar() }} âm lịch
          </span>
        }
      </p>
      <span class="mt-4 inline-flex items-center gap-1 text-sm font-semibold group-hover:underline">
        Xem chi tiết
        <app-icon
          name="chevronRight"
          [size]="14"
          class="transition-[translate] duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-none"
        />
      </span>
    </a>
  `,
})
export class TodayNextCard {
  readonly next = input.required<Occurrence>();
  readonly countdown = input('');
  readonly relative = input('');
  readonly lunar = input('');
  readonly showLunar = input(true);
}
