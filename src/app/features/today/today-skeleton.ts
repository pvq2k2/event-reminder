import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ZardSkeletonComponent } from '@shared/components/skeleton';

@Component({
  selector: 'app-today-skeleton',
  imports: [ZardSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải">
      <div class="flex items-center justify-between gap-4">
        <z-skeleton class="h-8 w-40" />
        <z-skeleton class="h-10 w-28" />
      </div>
      <div class="grid grid-cols-7 gap-2 md:hidden">
        @for (i of days; track i) {
          <z-skeleton class="h-14 w-full" />
        }
      </div>
      <z-skeleton class="h-32 w-full rounded-xl" />
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="rounded-xl border border-border bg-card p-4">
          <z-skeleton class="mb-4 h-5 w-40" />
          @for (i of rows; track i) {
            <div class="mb-3 flex gap-3">
              <z-skeleton class="h-4 w-12 shrink-0" />
              <z-skeleton class="h-16 w-full rounded-xl" />
            </div>
          }
        </div>
        <div class="hidden flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-1">
          <z-skeleton class="h-64 w-full rounded-xl" />
          <z-skeleton class="h-52 w-full rounded-xl" />
        </div>
      </div>
    </div>
  `,
})
export class TodaySkeleton {
  protected readonly days = [1, 2, 3, 4, 5, 6, 7];
  protected readonly rows = [1, 2, 3];
}
