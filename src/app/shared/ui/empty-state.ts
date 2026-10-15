import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZardButtonComponent } from '@shared/components/button';

/** Trạng thái trống dùng chung: icon + tiêu đề + mô tả + hành động gợi ý. */
@Component({
  selector: 'app-empty-state',
  imports: [RouterLink, ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="grid place-items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center"
      aria-label="Trạng thái trống"
    >
      <h2 class="text-lg font-semibold">{{ title() }}</h2>
      <p class="max-w-sm text-sm text-muted-foreground">{{ description() }}</p>
      @if (actionLink()) {
        <a z-button zSize="lg" [routerLink]="actionLink()" class="mt-2">
          {{ actionLabel() }}
        </a>
      }
    </section>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly actionLabel = input<string>('');
  readonly actionLink = input<string | null>(null);
}
