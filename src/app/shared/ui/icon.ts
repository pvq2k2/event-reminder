import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export const ICON_NAMES = [
  'today',
  'calendar',
  'contacts',
  'settings',
  'plus',
  'bell',
  'moon',
  'pin',
  'x',
  'chevronLeft',
  'chevronRight',
  'refresh',
  'alertTriangle',
] as const;
export type IconName = (typeof ICON_NAMES)[number];

/**
 * Bộ icon SVG nội bộ (stroke=currentColor).
 * Render bằng template, KHÔNG dùng `[innerHTML]`: Angular sanitizer lọc bỏ
 * toàn bộ thẻ `<svg>` trong innerHTML nên icon không hiện (đã có test hồi quy).
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('today') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        }
        @case ('calendar') {
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        }
        @case ('contacts') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
        }
        @case ('settings') {
          <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('bell') {
          <path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" />
          <path d="M10 21h4" />
        }
        @case ('moon') {
          <path d="M20 14A8 8 0 019.5 4 8 8 0 1020 14z" />
        }
        @case ('pin') {
          <path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        }
        @case ('x') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('chevronLeft') {
          <path d="M15 6l-6 6 6 6" />
        }
        @case ('chevronRight') {
          <path d="M9 6l6 6-6 6" />
        }
        @case ('refresh') {
          <path d="M20 11a8 8 0 10-2 6M20 5v6h-6" />
        }
        @case ('alertTriangle') {
          <path d="M12 4l9 16H3z" />
          <path d="M12 10v4M12 17v.5" />
        }
      }
    </svg>
  `,
})
export class AppIcon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
}
