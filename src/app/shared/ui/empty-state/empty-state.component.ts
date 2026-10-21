import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZardButtonComponent } from '@shared/components/button';

import { AppIconComponent, type IconName } from '../icon/icon.component';

/** Trạng thái trống dùng chung: icon + tiêu đề + mô tả + hành động gợi ý. */
@Component({
  selector: 'app-empty-state',
  imports: [AppIconComponent, RouterLink, ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="grid place-items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center"
      aria-label="Trạng thái trống"
    >
      @if (icon(); as name) {
        <span class="mb-2 grid size-20 place-items-center rounded-3xl bg-muted text-muted-foreground">
          <app-icon [name]="name" [size]="34" />
        </span>
      }
      <h2 class="text-lg font-semibold">{{ title() }}</h2>
      <p class="max-w-sm text-sm text-muted-foreground">{{ description() }}</p>
      @if (actionLink()) {
        <a z-button zSize="lg" [routerLink]="actionLink()" class="mt-2">
          {{ actionLabel() }}
        </a>
      }
      <ng-content />
    </section>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly actionLabel = input<string>('');
  readonly actionLink = input<string | null>(null);
  readonly icon = input<IconName | null>(null);
}
