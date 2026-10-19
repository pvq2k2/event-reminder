import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ZardAlertComponent } from '@shared/components/alert';
import { ZardButtonComponent } from '@shared/components/button';
import { ZardInputComponent } from '@shared/components/input';
import { Field } from '@shared/ui/field';
import { EventCreateStore } from './event-create.store';

/** Bước 3/4 — kiểu lặp, chi tiết, tháng nhuận/thiếu ngày, kết thúc, xem trước. */
@Component({
  selector: 'app-step-repeat',
  imports: [ReactiveFormsModule, Field, ZardButtonComponent, ZardInputComponent, ZardAlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <h1 class="text-2xl font-bold tracking-tight">Có lặp lại không?</h1>
    <div class="mt-3 grid gap-2" role="radiogroup" aria-label="Kiểu lặp">
      @for (r of store.repeats; track r.id) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="store.repeatKind() === r.id"
          (click)="store.setRepeat(r.id)"
          class="flex items-center gap-3 rounded-xl border p-3 text-left"
          [class.border-primary]="store.repeatKind() === r.id"
          [class.border-border]="store.repeatKind() !== r.id"
          [class.bg-accent]="store.repeatKind() === r.id"
        >
          <i
            aria-hidden="true"
            class="flex size-5.5 shrink-0 items-center justify-center rounded-full border-2"
            [class.border-primary]="store.repeatKind() === r.id"
            [class.border-muted-foreground]="store.repeatKind() !== r.id"
          >
            @if (store.repeatKind() === r.id) {
              <i class="size-2.5 rounded-full bg-primary"></i>
            }
          </i>
          <span class="flex-1">
            <b class="block text-sm">{{ r.label }}</b>
            <span class="text-xs text-muted-foreground">{{ r.hint }}</span>
          </span>
        </button>
      }
    </div>
    @if (store.repeatKind() === 'daily') {
      <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">CHI TIẾT</p>
      <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Chi tiết lặp">
        @for (s of store.subKindOpts; track s.id) {
          <button
            z-button
            [zType]="store.form.controls.subKind.value === s.id ? 'default' : 'secondary'"
            type="button"
            role="radio"
            [attr.aria-checked]="store.form.controls.subKind.value === s.id"
            (click)="store.form.controls.subKind.setValue(s.id)"
            class="h-11 rounded-full px-4 text-sm md:h-9"
          >
            {{ s.label }}
          </button>
        }
      </div>
      <div class="mt-2 flex items-center gap-2">
        <div class="w-28">
          <app-field label="Mỗi"
            ><input
              z-input
              type="number"
              [formControl]="store.form.controls.interval"
              min="1"
              class="h-11 bg-card md:h-9"
          /></app-field>
        </div>
        <p class="pt-6 text-sm text-muted-foreground">{{ store.intervalUnit() }}</p>
      </div>
    }
    @if (store.showWeekdays()) {
      <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">THỨ TRONG TUẦN</p>
      <div class="mt-2 flex flex-wrap gap-2">
        @for (d of store.weekOpts; track d.v) {
          <button
            z-button
            [zType]="store.selectedWeekdays().includes(d.v) ? 'default' : 'secondary'"
            type="button"
            (click)="store.toggleWeekday(d.v)"
            [attr.aria-pressed]="store.selectedWeekdays().includes(d.v)"
            class="h-11 rounded-full px-4 text-sm md:h-9"
          >
            {{ d.label }}
          </button>
        }
      </div>
    }
    @if (store.repeatKind() === 'yearly-lunar') {
      <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">
        NẾU NĂM ĐÓ KHÔNG CÓ THÁNG NÀY (THÁNG NHUẬN)
      </p>
      <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Tháng nhuận">
        @for (p of store.leapOpts; track p.id) {
          <button
            z-button
            [zType]="store.form.controls.leapPolicy.value === p.id ? 'default' : 'secondary'"
            type="button"
            role="radio"
            [attr.aria-checked]="store.form.controls.leapPolicy.value === p.id"
            (click)="store.form.controls.leapPolicy.setValue(p.id)"
            class="h-11 rounded-full px-4 text-sm md:h-9"
          >
            {{ p.label }}
          </button>
        }
      </div>
    }
    @if (store.showMissingDay()) {
      <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">THÁNG THIẾU NGÀY</p>
      <div class="mt-2 flex flex-wrap gap-2">
        @for (p of store.missingOpts; track p.id) {
          <button
            z-button
            [zType]="store.form.controls.missingDay.value === p.id ? 'default' : 'secondary'"
            type="button"
            (click)="store.form.controls.missingDay.setValue(p.id)"
            class="h-11 rounded-full px-4 text-sm md:h-9"
          >
            {{ p.label }}
          </button>
        }
      </div>
      <p class="mt-2 text-xs text-muted-foreground">Ngày {{ store.monthDayHint() }} hằng tháng.</p>
    }
    @if (store.repeatKind() !== 'none') {
      <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">KẾT THÚC</p>
      <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Kết thúc">
        @for (e of store.endOpts; track e.id) {
          <button
            z-button
            [zType]="store.endType() === e.id ? 'default' : 'secondary'"
            type="button"
            role="radio"
            [attr.aria-checked]="store.endType() === e.id"
            (click)="store.setEnd(e.id)"
            class="h-11 rounded-full px-4 text-sm md:h-9"
          >
            {{ e.label }}
          </button>
        }
      </div>
      @if (store.endType() === 'until') {
        <div class="mt-2">
          <app-field label="Kết thúc vào ngày"
            ><input
              z-input
              type="date"
              [formControl]="store.form.controls.endConditionDate"
              class="h-11 bg-card md:h-9"
            />
            /></app-field
          >
        </div>
      }
      @if (store.endType() === 'count') {
        <div class="mt-2">
          <app-field label="Sau N lần"
            ><input
              z-input
              type="number"
              [formControl]="store.form.controls.endConditionCount"
              min="1"
              class="h-11 bg-card md:h-9"
          /></app-field>
        </div>
      }
      <div class="mt-3 rounded-xl border border-border bg-card p-3">
        <b class="text-sm">5 lần tới</b>
        @for (o of store.preview(); track o.occurrenceKey) {
          <p class="mt-1 text-sm text-muted-foreground">{{ store.formatVi(o.date) }} · {{ store.weekdayVi(o.date) }}</p>
        } @empty {
          <p class="mt-1 text-sm text-muted-foreground">Chưa có lần nào trong 5 năm tới với quy tắc này.</p>
        }
      </div>
    }
    @if (store.ruleError()) {
      <z-alert zType="destructive" [zDescription]="store.ruleError() ?? ''" class="mt-2" />
    }
  `,
})
export class StepRepeat {
  protected readonly store = inject(EventCreateStore);
}
