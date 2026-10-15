import { Injectable, signal } from '@angular/core';

/**
 * Facade toast của app trên Sonner (ZardUI). Giữ nguyên API cũ để caller
 * (`EventService`, các page) không phải đổi: thông báo ngắn + 1 action tùy chọn.
 *
 * Sonner (lib `ngx-sonner` + ng-icons, ~90KB) KHÔNG nằm ở initial bundle:
 * - `<z-sonner>` trong AppShell được mount lazy bằng `@defer` khi `hostNeeded` bật;
 * - implementation cũng `import()` động ở lần `show()`/`dismiss()` đầu tiên.
 * (Ngân sách initial 500KB — xem docs/CONVENTIONS.md §2.)
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly hostNeeded = signal(false);

  show(message: string, opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }): void {
    this.hostNeeded.set(true);
    void import('@shared/components/sonner').then((m) => {
      // ZardSonnerService không có dependency inject nên new trực tiếp được;
      // import động để chunk sonner chỉ tải khi thật sự cần.
      new m.ZardSonnerService().show(message, {
        duration: opts?.durationMs ?? 5000,
        action: opts?.actionLabel ? { label: opts.actionLabel, onClick: () => opts.onAction?.() } : undefined,
      });
    });
  }

  dismiss(id?: string | number): void {
    if (!this.hostNeeded()) return;
    void import('@shared/components/sonner').then((m) => {
      new m.ZardSonnerService().dismiss(id);
    });
  }
}
