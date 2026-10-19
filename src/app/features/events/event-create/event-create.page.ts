import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventValidationError, type NewEvent } from '@core/data/event.repository';
import { EventService } from '@core/data/event.service';
import { SettingsRepository } from '@core/data/settings.repository';
import { ZardAlertComponent } from '@shared/components/alert';
import { ZardButtonComponent } from '@shared/components/button';
import { AppIcon } from '@shared/ui/icon';
import { ToastService } from '@shared/ui/toast';
import { mergeClasses } from '@shared/utils/merge-classes';
import { EventCreateStore } from './event-create.store';
import { StepBasics } from './step-basics';
import { StepRemind } from './step-remind';
import { StepRepeat } from './step-repeat';
import { StepWhen } from './step-when';

/**
 * Form tạo sự kiện 4 bước theo design Step1–Step4.
 * Page giữ khung header–scroll–footer, điều hướng bước (kèm hoạt ảnh) và lưu;
 * form/state/derived nằm trong `EventCreateStore`, mỗi bước là một component riêng.
 */
@Component({
  selector: 'app-event-create-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ZardButtonComponent,
    ZardAlertComponent,
    AppIcon,
    StepBasics,
    StepWhen,
    StepRepeat,
    StepRemind,
  ],
  providers: [EventCreateStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Host phải block + cao full để khung header-scroll-footer bên trong tính đúng.
  host: { class: 'block h-full min-h-0' },
  template: `
    <form [formGroup]="store.form" (ngSubmit)="save()" class="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col">
      <div class="shrink-0 px-4 pt-4 md:px-6 md:pt-6">
        <div class="flex items-center justify-between">
          <a z-button zSize="icon" class="size-11 rounded-xl" routerLink="/today" aria-label="Đóng">
            <app-icon name="x" [size]="20" />
          </a>
          <span class="flex-1 text-center text-sm text-muted-foreground">Bước {{ step() }}/4</span>
          <span class="w-11"></span>
        </div>
        <div class="mt-2 flex gap-1.5" aria-hidden="true">
          @for (i of [1, 2, 3, 4]; track i) {
            <i
              class="h-1.5 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none"
              [class.bg-primary]="i <= step()"
              [class.bg-muted]="i > step()"
            ></i>
          }
        </div>
      </div>

      <div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-6">
        @if (saveError()) {
          <z-alert
            zType="destructive"
            [zDescription]="saveError() ?? ''"
            class="mb-4 animate-in duration-200 fade-in motion-reduce:animate-none"
          />
        }
        @switch (step()) {
          @case (1) {
            <div [class]="stepAnimCls()"><app-step-basics /></div>
          }
          @case (2) {
            <div [class]="stepAnimCls()"><app-step-when /></div>
          }
          @case (3) {
            <div [class]="stepAnimCls()"><app-step-repeat /></div>
          }
          @case (4) {
            <div [class]="stepAnimCls()"><app-step-remind /></div>
          }
        }
      </div>

      <div class="shrink-0 border-t border-border bg-card p-4">
        <!-- Hai nút giữ nguyên element khi đổi bước (chỉ đổi nhãn/handler) để không giật layout. -->
        <div class="flex gap-2">
          <button
            z-button
            [zType]="step() === 1 ? 'outline' : 'secondary'"
            zSize="lg"
            type="button"
            (click)="secondaryAction()"
            [disabled]="step() === 1 && saving()"
            class="h-12 flex-1 cursor-pointer md:h-10"
          >
            {{ step() === 1 ? 'Lưu nhanh' : 'Quay lại' }}
          </button>
          <button
            z-button
            zSize="lg"
            [type]="step() === 4 ? 'submit' : 'button'"
            (click)="primaryAction()"
            [disabled]="saving()"
            [zLoading]="saving() && step() === 4"
            class="h-12 flex-1 cursor-pointer md:h-10"
          >
            {{ step() === 4 ? (saving() ? 'Đang lưu…' : 'Tạo sự kiện') : 'Tiếp tục' }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class EventCreatePage {
  private readonly events = inject(EventService);
  private readonly settings = inject(SettingsRepository);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly store = inject(EventCreateStore);
  protected readonly step = signal(1);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  /** Hướng chuyển bước: 1 = tiến (trượt từ phải), -1 = lùi (trượt từ trái). */
  private readonly dir = signal<1 | -1>(1);

  /** Hoạt ảnh vào của nội dung bước; tôn trọng prefers-reduced-motion. */
  protected stepAnimCls(): string {
    return mergeClasses(
      'animate-in fade-in duration-250 motion-reduce:animate-none',
      this.dir() === -1 ? 'slide-in-from-left-4' : 'slide-in-from-right-4',
    );
  }

  /** Nút phụ footer giữ nguyên element khi đổi bước để không giật: bước 1 = Lưu nhanh, còn lại = Quay lại. */
  protected secondaryAction(): void {
    if (this.step() === 1) void this.quickSave();
    else this.prev();
  }
  /** Nút chính footer: các bước 1–3 = Tiếp tục, bước 4 submit form (ngSubmit). */
  protected primaryAction(): void {
    if (this.step() < 4) this.next();
  }
  protected next(): void {
    const form = this.store.form.controls;
    if (this.step() === 1 && !form.title.value.trim()) {
      form.title.markAsTouched();
      return;
    }
    if (this.step() === 2) {
      if (form.calendarSystem.value === 'lunar' && this.store.lunarResolved() === null) return;
      if (this.store.dateError() || this.store.timeError()) return;
    }
    this.dir.set(1);
    this.step.update((s) => Math.min(4, s + 1));
  }
  protected prev(): void {
    this.dir.set(-1);
    this.step.update((s) => Math.max(1, s - 1));
  }

  protected async quickSave(): Promise<void> {
    if (!this.store.form.controls.title.value.trim()) {
      this.store.form.controls.title.markAsTouched();
      this.dir.set(-1);
      this.step.set(1);
      return;
    }
    await this.persist(this.store.payload(true));
  }

  protected async save(): Promise<void> {
    if (this.step() < 4) return;
    await this.persist(this.store.payload(false));
  }

  private async persist(input: NewEvent): Promise<void> {
    this.saveError.set(null);
    this.saving.set(true);
    try {
      await this.events.create(input);
      try {
        const s = await this.settings.get();
        if (input.isAllDay && this.store.form.controls.allDayTime.value !== s.allDayReminderTime) {
          await this.settings.update({ allDayReminderTime: this.store.form.controls.allDayTime.value });
        }
      } catch {
        /* giữ allDayReminderTime cũ khi settings lỗi */
      }
      this.toast.show('Đã tạo sự kiện');
      await this.router.navigate(['/']);
    } catch (e) {
      if (e instanceof EventValidationError) {
        const keys = Object.keys(e.errors);
        this.saveError.set(Object.values(e.errors)[0] ?? 'Dữ liệu không hợp lệ');
        if (keys.includes('title')) {
          this.dir.set(-1);
          this.step.set(1);
        } else if (keys.some((k) => ['startDate', 'endTime'].includes(k))) {
          this.step.set(2);
        } else if (keys.includes('rule')) {
          this.step.set(3);
        } else {
          this.step.set(4);
        }
      } else {
        this.saveError.set('Không lưu được sự kiện. Hãy thử lại.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
