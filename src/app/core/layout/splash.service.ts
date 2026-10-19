import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Injectable, inject } from '@angular/core';
import { filter, firstValueFrom } from 'rxjs';

/** Thời gian hiện tối thiểu để đủ thấy branding (ms). */
const MIN_VISIBLE_MS = 1000;
/** Chờ app ổn định tối đa; quá hạn vẫn ẩn để không treo splash (ms). */
const READY_TIMEOUT_MS = 3000;
/** Thời lượng fade khớp transition trong `index.html` (ms). */
const FADE_MS = 300;

/**
 * Ẩn splash "tĩnh" (đánh dấu `#er-splash` trong `index.html`) khi app render ổn định,
 * nhưng không sớm hơn `MIN_VISIBLE_MS`. No-op khi không có phần tử (môi trường test).
 */
@Injectable({ providedIn: 'root' })
export class SplashService {
  private readonly doc = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly startedAt = performance.now();

  async dismissWhenReady(): Promise<void> {
    const el = this.doc.getElementById('er-splash');
    if (!el) return;

    const stable = firstValueFrom(this.appRef.isStable.pipe(filter(Boolean)));
    await Promise.race([stable, new Promise((resolve) => setTimeout(resolve, READY_TIMEOUT_MS))]);

    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - this.startedAt));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

    const reduce = this.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    el.classList.add('er-splash--hide');
    if (reduce) {
      el.remove();
      return;
    }
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        el.remove();
        resolve();
      };
      el.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, FADE_MS + 100);
    });
  }
}
