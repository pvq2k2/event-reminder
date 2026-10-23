import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type AppTheme = 'default' | 'light26' | 'light27';
export type AppMode = 'light' | 'dark' | 'system';
export type FontScale = 'sm' | 'md' | 'default' | 'lg' | 'xl';

export const THEMES: readonly { id: AppTheme; label: string }[] = [
  { id: 'default', label: 'Mặc định' },
  { id: 'light26', label: 'Light26 · Teal' },
  { id: 'light27', label: 'Light27 · Blue' },
];
export const FONT_SCALES: Record<FontScale, { label: string; percent: number }> = {
  sm: { label: 'Nhỏ', percent: 87.5 },
  md: { label: 'Vừa', percent: 93.75 },
  default: { label: 'Mặc định', percent: 100 },
  lg: { label: 'Lớn', percent: 112.5 },
  xl: { label: 'Rất lớn', percent: 125 },
};

const THEME_SWITCH_MS = 80;

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

/** Lưu ở localStorage (đọc đồng bộ) để áp dụng trước lần render đầu, tránh nháy sáng/tối. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly html = this.doc.documentElement;
  readonly theme = signal<AppTheme>(
    read(
      'er.theme',
      THEMES.map((t) => t.id),
      'default',
    ),
  );
  readonly mode = signal<AppMode>(read('er.mode', ['light', 'dark', 'system'], 'system'));
  readonly fontScale = signal<FontScale>(read('er.font', Object.keys(FONT_SCALES) as FontScale[], 'default'));
  private readonly media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  private readonly systemDark = signal(this.media?.matches ?? false);
  private themeSwitchTimer: ReturnType<typeof setTimeout> | undefined;
  readonly isDark = computed(() => this.mode() === 'dark' || (this.mode() === 'system' && this.systemDark()));

  constructor() {
    this.media?.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      const theme = this.theme(),
        mode = this.mode(),
        font = this.fontScale();
      this.html.classList.add('theme-switching');
      this.html.classList.remove('theme-light26', 'theme-light27');
      if (theme !== 'default') this.html.classList.add(`theme-${theme}`);
      this.html.classList.toggle('dark', mode === 'dark' || (mode === 'system' && this.systemDark()));
      this.html.style.setProperty('--app-font-size', `${FONT_SCALES[font].percent}%`);
      this.syncThemeColor();
      clearTimeout(this.themeSwitchTimer);
      this.themeSwitchTimer = setTimeout(() => {
        this.html.classList.remove('theme-switching');
        this.themeSwitchTimer = undefined;
      }, THEME_SWITCH_MS);
      try {
        localStorage.setItem('er.theme', theme);
        localStorage.setItem('er.mode', mode);
        localStorage.setItem('er.font', font);
      } catch {
        /* chế độ riêng tư có thể chặn storage */
      }
    });
  }

  /** Đồng bộ `<meta name="theme-color">` với màu nền hiện tại (thanh trạng thái trình duyệt/PWA). */
  private syncThemeColor(): void {
    const value = getComputedStyle(this.html).getPropertyValue('--background').trim();
    if (!value) return;
    let meta = this.doc.head.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = this.doc.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      this.doc.head.appendChild(meta);
    }
    meta.setAttribute('content', value);
  }
}
