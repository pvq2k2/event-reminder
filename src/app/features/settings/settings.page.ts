import { ChangeDetectionStrategy, Component, inject, isDevMode } from '@angular/core';
import { DemoSeed } from '@core/data/seed';
import { NotificationPermissionService } from '@core/notifications/notification-permission.service';
import { type AppMode, FONT_SCALES, type FontScale, THEMES, ThemeService } from '@core/theme/theme.service';
import { cn } from '@shared/utils/cn';

const MODES: readonly { id: AppMode; label: string }[] = [
  { id: 'system', label: 'Tự động' },
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
];
const PERMISSION_TEXT = {
  granted: 'Đã cấp quyền',
  denied: 'Đã bị từ chối. Hãy bật lại trong cài đặt trình duyệt (biểu tượng ổ khóa cạnh thanh địa chỉ).',
  default: 'Chưa cấp quyền',
  unsupported: 'Trình duyệt này không hỗ trợ thông báo',
} as const;

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <h1 class="text-2xl font-bold tracking-tight">Cài đặt</h1>

      <section class="rounded-xl border border-border bg-card p-4">
        <h2 class="font-semibold">Chế độ hiển thị</h2>
        <div class="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Chế độ hiển thị">
          @for (m of modes; track m.id) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="theme.mode() === m.id"
              (click)="theme.mode.set(m.id)"
              [class]="seg(theme.mode() === m.id)"
            >
              {{ m.label }}
            </button>
          }
        </div>
        <h2 class="mt-5 font-semibold">Bộ màu</h2>
        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Bộ màu">
          @for (t of themes; track t.id) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="theme.theme() === t.id"
              (click)="theme.theme.set(t.id)"
              [class]="
                cn(
                  'h-11 rounded-md border px-3 text-sm font-medium md:h-9',
                  theme.theme() === t.id ? 'border-primary bg-accent text-accent-foreground' : 'border-input'
                )
              "
            >
              {{ t.label }}
            </button>
          }
        </div>
        <h2 class="mt-5 font-semibold">Cỡ chữ</h2>
        <div class="mt-3 grid grid-cols-5 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Cỡ chữ">
          @for (f of scales; track f[0]) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="theme.fontScale() === f[0]"
              (click)="theme.fontScale.set(f[0])"
              [class]="seg(theme.fontScale() === f[0])"
            >
              {{ f[1].label }}
            </button>
          }
        </div>
      </section>

      <section class="rounded-xl border border-border bg-card p-4">
        <h2 class="font-semibold">Thông báo</h2>
        <p class="mt-1 text-sm text-muted-foreground">{{ permissionText() }}</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Trình duyệt chỉ nhắc khi ứng dụng đang mở hoặc đã cài (PWA). Xem docs/SOLUTION.md §8.
        </p>
        @if (permission.state() === 'default') {
          <button
            type="button"
            (click)="permission.request()"
            class="mt-3 h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground md:h-9"
          >
            Cho phép thông báo
          </button>
        }
      </section>

      @if (dev) {
        <section class="rounded-xl border border-dashed border-border p-4">
          <h2 class="font-semibold">Công cụ phát triển</h2>
          <button
            type="button"
            (click)="seed.run()"
            class="mt-3 h-11 rounded-md border border-input px-4 text-sm font-medium md:h-9"
          >
            Nạp dữ liệu mẫu
          </button>
        </section>
      }
    </div>
  `,
})
export class SettingsPage {
  protected readonly theme = inject(ThemeService);
  protected readonly permission = inject(NotificationPermissionService);
  protected readonly seed = inject(DemoSeed);
  protected readonly modes = MODES;
  protected readonly themes = THEMES;
  protected readonly scales = Object.entries(FONT_SCALES) as [FontScale, { label: string }][];
  protected readonly dev = isDevMode();
  protected readonly cn = cn;
  protected permissionText = () => PERMISSION_TEXT[this.permission.state()];
  protected seg = (on: boolean) =>
    cn(
      'h-10 rounded-md text-sm font-medium transition-colors md:h-8',
      on ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
    );
}
