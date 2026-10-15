import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bọc label + control + thông báo lỗi cho form. Truyền label rỗng khi nhãn nằm gọn trong hộp control. */
@Component({
  selector: 'app-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="block">
      @if (label()) {
        <span class="mb-1.5 block text-sm font-medium">{{ label() }}</span>
      }
      <ng-content />
      @if (error()) {
        <span role="alert" class="mt-1.5 block text-sm text-destructive">{{ error() }}</span>
      } @else if (hint()) {
        <span class="mt-1.5 block text-xs text-muted-foreground">{{ hint() }}</span>
      }
    </div>
  `,
})
export class Field {
  readonly label = input<string>('');
  readonly error = input<string | null>(null);
  readonly hint = input<string>('');
}
