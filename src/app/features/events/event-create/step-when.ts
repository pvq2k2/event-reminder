import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ZardAlertComponent } from '@shared/components/alert';
import { ZardInputComponent } from '@shared/components/input';
import { ZardSwitchComponent } from '@shared/components/switch';
import { Field } from '@shared/ui/field';
import { WheelPicker } from '@shared/ui/wheel-picker';
import { EventCreateStore } from './event-create.store';

/** Bước 2/4 — chọn âm/dương lịch, ngày giờ, cả ngày. */
@Component({
  selector: 'app-step-when',
  imports: [ReactiveFormsModule, Field, WheelPicker, ZardSwitchComponent, ZardAlertComponent, ZardInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <h1 class="text-2xl font-bold tracking-tight">Khi nào diễn ra?</h1>
    <div class="relative mt-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Lịch">
      <span
        aria-hidden="true"
        class="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-background shadow-sm transition-transform duration-200 motion-reduce:transition-none"
        [class.translate-x-full]="store.form.controls.calendarSystem.value === 'lunar'"
      ></span>
      @for (s of store.systems; track s.id) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="store.form.controls.calendarSystem.value === s.id"
          (click)="store.form.controls.calendarSystem.setValue(s.id)"
          class="relative rounded-md py-2 text-sm font-medium"
          [class.text-muted-foreground]="store.form.controls.calendarSystem.value !== s.id"
        >
          {{ s.label }}
        </button>
      }
    </div>
    @if (store.form.controls.calendarSystem.value === 'gregorian') {
      <div class="mt-4">
        <div class="grid grid-cols-3 text-center text-sm font-medium text-muted-foreground">
          <p>Ngày</p>
          <p>Tháng</p>
          <p>Năm</p>
        </div>
        <div class="relative mt-1 rounded-2xl border border-border bg-card p-2">
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-2 top-1/2 z-0 h-9 -translate-y-1/2 rounded-xl bg-accent"
          ></div>
          <div class="relative grid grid-cols-3 gap-1">
            <app-wheel-picker
              bare
              label="Ngày dương"
              [options]="store.gregDayOpts()"
              [value]="store.gregParts().d"
              (valueChange)="store.setGregPart('d', $event)"
            />
            <app-wheel-picker
              bare
              label="Tháng dương"
              [options]="store.gregMonthOpts"
              [value]="store.gregParts().m"
              (valueChange)="store.setGregPart('m', $event)"
            />
            <app-wheel-picker
              bare
              label="Năm dương"
              [options]="store.gregYearOpts"
              [value]="store.gregParts().y"
              (valueChange)="store.setGregPart('y', $event)"
            />
          </div>
        </div>
      </div>
      <p class="mt-2 rounded-lg bg-muted p-3 text-sm">
        = <b>{{ store.lunarLine() }}</b>
      </p>
    } @else {
      <div class="mt-4">
        <div class="grid grid-cols-3 text-center text-sm font-medium text-muted-foreground">
          <p>Ngày</p>
          <p>Tháng</p>
          <p>Năm</p>
        </div>
        <div class="relative mt-1 rounded-2xl border border-border bg-card p-2">
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-2 top-1/2 z-0 h-9 -translate-y-1/2 rounded-xl bg-accent"
          ></div>
          <div class="relative grid grid-cols-3 gap-1">
            <app-wheel-picker
              bare
              label="Ngày âm"
              [options]="store.lunarDayOpts"
              [value]="store.str(store.form.controls.lunarDay.value)"
              (valueChange)="store.setLunarPart('lunarDay', $event)"
            />
            <app-wheel-picker
              bare
              label="Tháng âm"
              [options]="store.lunarMonthOpts"
              [value]="store.str(store.form.controls.lunarMonth.value)"
              (valueChange)="store.setLunarPart('lunarMonth', $event)"
            />
            <app-wheel-picker
              bare
              label="Năm âm"
              [options]="store.lunarYearOpts"
              [value]="store.str(store.form.controls.lunarYear.value)"
              (valueChange)="store.setLunarPart('lunarYear', $event)"
            />
          </div>
        </div>
      </div>
      @if (store.lunarResolved() === null) {
        <z-alert
          zType="destructive"
          zDescription="Ngày âm này không tồn tại trong năm đã chọn (tháng nhuận không có hoặc tháng thiếu ngày 30). Hãy đổi ngày."
          class="mt-2"
        />
      } @else {
        <p class="mt-2 rounded-lg bg-muted p-3 text-sm">
          = <b>{{ store.weekdayVi(store.lunarResolved()!) }}, {{ store.formatVi(store.lunarResolved()!) }}</b> dương
          lịch · năm {{ store.canChi(store.lunarYearVal()) }}
        </p>
      }
      <div class="mt-2 flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <span class="text-sm font-medium">Tháng nhuận</span>
        <z-switch [formControl]="store.form.controls.isLeapMonth"><span class="sr-only">Tháng nhuận</span></z-switch>
      </div>
    }
    <div class="mt-2 flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <span class="text-sm font-medium">Cả ngày</span>
      <z-switch [formControl]="store.form.controls.isAllDay"><span class="sr-only">Cả ngày</span></z-switch>
    </div>
    @if (!store.form.controls.isAllDay.value) {
      <div class="mt-2 grid grid-cols-2 gap-2">
        <app-field label="Bắt đầu" [error]="store.timeError()"
          ><input z-input type="time" [formControl]="store.form.controls.startTime" class="h-11 bg-card md:h-9"
        /></app-field>
        <app-field label="Kết thúc"
          ><input z-input type="time" [formControl]="store.form.controls.endTime" class="h-11 bg-card md:h-9"
        /></app-field>
      </div>
    }
  `,
})
export class StepWhen {
  protected readonly store = inject(EventCreateStore);
}
