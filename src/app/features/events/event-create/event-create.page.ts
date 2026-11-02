import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventValidationError, type NewEvent } from '@core/data/event.repository';
import { EventService } from '@core/data/event.service';
import { SettingsRepository } from '@core/data/settings.repository';
import { ZardAlertComponent } from '@shared/components/alert';
import { ZardButtonComponent } from '@shared/components/button';
import { ZardDialogImports } from '@shared/components/dialog';
import { ZardSonnerService } from '@shared/components/sonner/sonner.service';
import { AppIconComponent } from '@shared/ui';
import { mergeClasses } from '@shared/utils/merge-classes';

import { EventCreateStore } from './event-create.store';
import { StepBasics } from './step-basics';
import { StepRemind } from './step-remind';
import { StepRepeat } from './step-repeat';
import { StepWhen } from './step-when';

const DIALOG_CLASS = [
  'h-dvh max-h-dvh w-dvw max-w-none gap-0 overflow-hidden rounded-none p-0 ring-0 sm:max-w-none',
  'md:h-auto md:max-h-[calc(100dvh-2rem)] md:w-[min(40rem,calc(100vw-2rem))] md:max-w-[40rem] md:rounded-xl md:ring-1',
].join(' ');
const STEP_LABELS = ['Cơ bản', 'Thời gian', 'Lặp lại', 'Nhắc nhở'] as const;

/**
 * Form tạo sự kiện 4 bước trong dialog (design Step1–Step4, WebCreateDialog).
 * Page giữ khung header–scroll–footer, điều hướng bước (kèm hoạt ảnh) và lưu;
 * form/state/derived nằm trong `EventCreateStore`, mỗi bước là một component riêng.
 */
@Component({
  selector: 'app-event-create-page',
  imports: [
    AppIconComponent,
    ReactiveFormsModule,
    StepBasics,
    StepRemind,
    StepRepeat,
    StepWhen,
    ZardAlertComponent,
    ZardButtonComponent,
    ...ZardDialogImports,
  ],
  providers: [EventCreateStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <z-dialog
      [zVisible]="open()"
      (zVisibleChange)="open.set($event)"
      (zAfterClose)="leave()"
      [zClosable]="false"
      [zMaskClosable]="false"
      [class]="dialogClass"
    >
      <form
        [formGroup]="store.form"
        (ngSubmit)="save()"
        class="flex h-full max-h-none min-h-0 w-full flex-col md:h-auto md:max-h-[calc(100dvh-2rem)]"
      >
        <div class="shrink-0 px-4 pt-4 md:px-6 md:pt-6">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <z-dialog-title zTitle="Tạo sự kiện" class="block text-lg font-semibold" />
              <z-dialog-description [zDescription]="stepDescription()" class="block" />
            </div>
            <button
              z-button
              zType="ghost"
              zSize="icon"
              type="button"
              class="size-9 shrink-0 cursor-pointer"
              (click)="requestClose()"
              [disabled]="saving()"
              aria-label="Đóng"
            >
              <app-icon name="x" [size]="18" />
            </button>
          </div>
          <div class="mt-3 flex gap-1.5" aria-hidden="true">
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

        <div class="shrink-0 border-t border-border p-4">
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
    </z-dialog>
  `,
})
export class EventCreatePage {
  private readonly events = inject(EventService);
  private readonly settings = inject(SettingsRepository);
  private readonly router = inject(Router);
  private readonly sonner = inject(ZardSonnerService);

  protected readonly store = inject(EventCreateStore);
  protected readonly step = signal(1);
  protected readonly stepDescription = computed(() => `Bước ${this.step()} trong 4 · ${STEP_LABELS[this.step() - 1]}`);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly open = signal(true);
  protected readonly dialogClass = DIALOG_CLASS;
  /** Hướng chuyển bước: 1 = tiến (trượt từ phải), -1 = lùi (trượt từ trái). */
  private readonly dir = signal<1 | -1>(1);

  constructor() {
    this.store.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.saveError.set(null));
  }

  /** Hoạt ảnh vào của nội dung bước; tôn trọng prefers-reduced-motion. */
  protected stepAnimCls(): string {
    return mergeClasses(
      'animate-in fade-in duration-250 motion-reduce:animate-none',
      this.dir() === -1 ? 'slide-in-from-left-4' : 'slide-in-from-right-4',
    );
  }

  protected requestClose(): void {
    this.open.set(false);
  }

  protected leave(): void {
    void this.router.navigate(['/today']);
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
    if (!this.store.validateStep(this.step())) return;
    this.dir.set(1);
    this.saveError.set(null);
    this.step.update((s) => Math.min(4, s + 1));
  }
  protected prev(): void {
    this.dir.set(-1);
    this.saveError.set(null);
    this.step.update((s) => Math.max(1, s - 1));
  }

  protected async quickSave(): Promise<void> {
    if (!this.store.validateStep(1)) {
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
        const allDayTime = this.store.form.controls.allDayTime;
        if (input.isAllDay && allDayTime.value !== s.allDayReminderTime) {
          await this.settings.update({ allDayReminderTime: allDayTime.value });
        }
      } catch {
        /* giữ allDayReminderTime cũ khi settings lỗi */
      }
      this.sonner.success('Đã tạo sự kiện');
      await this.router.navigate(['/']);
    } catch (e) {
      if (e instanceof EventValidationError) {
        const keys = Object.keys(e.errors);
        this.saveError.set(Object.values(e.errors)[0] ?? 'Dữ liệu không hợp lệ');
        if (keys.includes('title')) {
          this.store.form.controls.title.markAsTouched();
          this.dir.set(-1);
          this.step.set(1);
        } else if (keys.some((k) => ['startDate', 'startTime', 'endTime'].includes(k))) {
          this.store.form.controls.startTime.markAsTouched();
          this.store.form.controls.endTime.markAsTouched();
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
