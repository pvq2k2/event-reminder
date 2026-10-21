import {
  type AfterViewInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  type ElementRef,
  input,
  model,
  type OnDestroy,
  viewChild,
} from '@angular/core';

export interface WheelOption {
  value: string;
  label: string;
}

/** Chiều cao một dòng (h-9) và số dòng hiển thị: khớp spacer 72px trong template. */
const ITEM_H = 36;
/** Nhịp lăn chuột tối thiểu giữa hai bước (chống flick nhảy nhiều số một lúc). */
const STEP_COOLDOWN_MS = 120;

/**
 * Bánh xe chọn 1 giá trị (kiểu iOS picker, đúng design Step2: 3 cột Ngày/Tháng/Năm).
 * ZardUI không có component này nên tự viết, chỉ dùng token theme.
 * - Lăn chuột: mỗi nhịp đúng 1 ô (chặn scroll tự do + cooldown).
 * - Kéo tay: cuộn tự do rồi snap về ô gần nhất.
 * - Bấm để nhảy tới, phím ↑/↓/Home/End.
 */
@Component({
  selector: 'app-wheel-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (!bare()) {
      <p class="mb-1.5 block text-sm font-medium">{{ label() }}</p>
    }
    <div class="relative">
      @if (!bare()) {
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-9 -translate-y-1/2 rounded-lg bg-muted"
        ></div>
      }
      <div
        #viewport
        role="listbox"
        [attr.aria-label]="label()"
        tabindex="0"
        (scroll)="onScroll()"
        (keydown)="onKeydown($event)"
        class="relative no-scrollbar h-45 snap-y snap-mandatory overflow-y-auto overscroll-contain mask-[linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] outline-none"
      >
        <div class="h-18 shrink-0" aria-hidden="true"></div>
        @for (o of options(); track o.value) {
          <button
            type="button"
            role="option"
            [attr.aria-selected]="o.value === value()"
            (click)="select(o.value)"
            [class.font-bold]="o.value === value()"
            [class.text-foreground]="o.value === value()"
            [class.text-muted-foreground]="o.value !== value()"
            [class.text-xl]="o.value === value()"
            class="relative z-1 flex h-9 w-full snap-center items-center justify-center text-lg"
          >
            {{ o.label }}
          </button>
        }
        <div class="h-18 shrink-0" aria-hidden="true"></div>
      </div>
    </div>
  `,
})
export class WheelPickerComponent implements AfterViewInit, OnDestroy {
  readonly label = input.required<string>();
  readonly options = input.required<readonly WheelOption[]>();
  readonly value = model<string>('');
  /** Chế độ trần: ẩn nhãn và dải highlight riêng (để card cha vẽ band chung suốt các cột). */
  readonly bare = input(false, { transform: booleanAttribute });

  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private timer = 0;
  private lastStep = 0;

  constructor() {
    // Giá trị đổi từ bên ngoài (form reset, đổi tháng/năm kẹp ngày) thì cuộn theo.
    effect(() => {
      const v = this.value();
      const items = this.options();
      const el = this.viewport()?.nativeElement;
      if (!el || !items.length) return;
      const idx = Math.max(
        0,
        items.findIndex((o) => o.value === v),
      );
      if (Math.round(el.scrollTop / ITEM_H) !== idx) this.scrollElTo(el, idx * ITEM_H, 'auto');
    });
  }

  ngAfterViewInit(): void {
    const el = this.viewport()?.nativeElement;
    // Chặn scroll tự do của chuột để mỗi nhịp lăn chỉ bước đúng 1 ô
    // (Angular gán wheel listener passive nên phải addEventListener tay).
    el?.addEventListener('wheel', this.onWheelNative, { passive: false });
    const items = this.options();
    if (!el || !items.length) return;
    const idx = Math.max(
      0,
      items.findIndex((o) => o.value === this.value()),
    );
    this.scrollElTo(el, idx * ITEM_H, 'auto');
  }

  ngOnDestroy(): void {
    this.viewport()?.nativeElement.removeEventListener('wheel', this.onWheelNative);
  }

  protected onScroll(): void {
    const el = this.viewport()?.nativeElement;
    if (!el) return;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      const items = this.options();
      if (!items.length) return;
      const idx = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      if (items[idx].value !== this.value()) this.value.set(items[idx].value);
    }, 110);
  }

  protected onKeydown(e: KeyboardEvent): void {
    const items = this.options();
    if (!items.length) return;
    const cur = Math.max(
      0,
      items.findIndex((o) => o.value === this.value()),
    );
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.select(items[Math.min(items.length - 1, cur + 1)].value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.select(items[Math.max(0, cur - 1)].value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      this.select(items[0].value);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.select(items[items.length - 1].value);
    }
  }

  protected select(v: string): void {
    if (v === this.value()) {
      this.snap(v);
      return;
    }
    this.value.set(v);
    this.snap(v);
  }

  /** Một nhịp lăn = đúng 1 ô theo hướng cuộn; nhịp dồn trong cooldown thì bỏ qua. */
  private readonly onWheelNative = (e: WheelEvent): void => {
    e.preventDefault();
    const now = Date.now();
    if (now - this.lastStep < STEP_COOLDOWN_MS) return;
    this.lastStep = now;
    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    this.stepBy(delta >= 0 ? 1 : -1);
  };

  private stepBy(dir: 1 | -1): void {
    const items = this.options();
    if (!items.length) return;
    const cur = Math.max(
      0,
      items.findIndex((o) => o.value === this.value()),
    );
    this.select(items[Math.min(items.length - 1, Math.max(0, cur + dir))].value);
  }

  private snap(v: string): void {
    const el = this.viewport()?.nativeElement;
    const idx = this.options().findIndex((o) => o.value === v);
    if (!el || idx < 0) return;
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scrollElTo(el, idx * ITEM_H, reduce ? 'auto' : 'smooth');
  }

  /** jsdom không có Element.scrollTo; trình duyệt thật luôn có. */
  private scrollElTo(el: HTMLElement, top: number, behavior: ScrollBehavior): void {
    if (typeof el.scrollTo === 'function') el.scrollTo({ top, behavior });
    else el.scrollTop = top;
  }
}
