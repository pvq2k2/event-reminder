import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ZardButtonComponent } from '@shared/components/button';

/**
 * Hộp xác nhận thao tác phá hủy (dùng overlay riêng + nút Zard;
 * Zard chưa có AlertDialog nên chưa dùng ZardDialogService ở đây).
 * Đóng bằng Esc, bấm nền để hủy.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4"
        (click)="cancelled.emit()"
        (keydown.enter)="cancelled.emit()"
        (keydown.escape)="cancelled.emit()"
        tabindex="0"
      >
        <div
          role="alertdialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.aria-describedby]="descId"
          class="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg"
          (click)="$event.stopPropagation()"
          (keydown.enter)="$event.stopPropagation()"
        >
          <h2 [id]="titleId" class="text-base font-semibold">{{ title() }}</h2>
          @if (description()) {
            <p [id]="descId" class="mt-2 text-sm text-muted-foreground">{{ description() }}</p>
          }
          <div class="mt-5 flex justify-end gap-2">
            <button z-button zType="outline" zSize="lg" type="button" (click)="cancelled.emit()">
              {{ cancelLabel() }}
            </button>
            <button
              z-button
              [zType]="danger() ? 'destructive' : 'default'"
              zSize="lg"
              type="button"
              (click)="confirmed.emit()"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly confirmLabel = input('Xóa');
  readonly cancelLabel = input('Hủy');
  readonly danger = input(true);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  protected readonly titleId = `confirm-${Math.random().toString(36).slice(2)}`;
  protected readonly descId = `confirm-desc-${Math.random().toString(36).slice(2)}`;
}
