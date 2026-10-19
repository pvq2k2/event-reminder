import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Logo thương hiệu (icon lịch có mặt đồng hồ) dùng ở splash và sidebar.
 * Tất cả màu lấy từ token theme (không mã màu cứng) nên tự đổi theo 6 biến thể
 * màu × sáng/tối. Render bằng template, không dùng `[innerHTML]` (sanitizer lọc `<svg>`).
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <rect width="100" height="100" rx="22.5" fill="var(--background)" />
      <rect x="21" y="26" width="58" height="53" rx="13" fill="var(--primary)" />
      <rect x="21" y="26" width="58" height="15" rx="9" fill="var(--primary-foreground)" opacity=".18" />
      <rect
        x="34"
        y="18"
        width="7"
        height="15"
        rx="3.5"
        fill="var(--primary)"
        stroke="var(--background)"
        stroke-width="2.5"
      />
      <rect
        x="59"
        y="18"
        width="7"
        height="15"
        rx="3.5"
        fill="var(--primary)"
        stroke="var(--background)"
        stroke-width="2.5"
      />
      <circle cx="46" cy="59" r="14" fill="var(--primary-foreground)" />
      <circle cx="52" cy="55" r="12" fill="var(--primary)" />
      <circle cx="64" cy="52" r="5" fill="var(--event-birthday)" />
    </svg>
  `,
})
export class AppLogo {
  readonly size = input(128);
}
