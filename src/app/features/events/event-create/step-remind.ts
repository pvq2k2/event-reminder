import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ZardButtonComponent } from '@shared/components/button';
import { ZardInputComponent } from '@shared/components/input';
import { ZardSwitchComponent } from '@shared/components/switch';
import { Field } from '@shared/ui/field';
import { AppIcon } from '@shared/ui/icon';
import { EventCreateStore } from './event-create.store';

/** Bước 4/4 — danh sách mốc nhắc, mốc tùy chọn, giờ nhắc cả ngày, xem lại. */
@Component({
  selector: 'app-step-remind',
  imports: [ReactiveFormsModule, Field, AppIcon, ZardButtonComponent, ZardInputComponent, ZardSwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <h1 class="text-2xl font-bold tracking-tight">Nhắc bạn lúc nào?</h1>
    <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      @for (o of store.reminderRows(); track o) {
        <div class="flex items-center gap-3 border-b border-border px-3.5 py-2.5 last:border-b-0">
          <span
            class="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-event-work/15 text-event-work-ink"
          >
            <app-icon name="bell" [size]="16" />
          </span>
          <span class="flex-1 text-sm">{{ store.offsetLabel(o) }}</span>
          <z-switch [zChecked]="store.selectedOffsets().includes(o)" (zCheckedChange)="store.toggleOffset(o)">
            <span class="sr-only">{{ store.offsetLabel(o) }}</span>
          </z-switch>
        </div>
      }
    </div>
    <button
      z-button
      zType="secondary"
      zSize="sm"
      zShape="circle"
      type="button"
      [attr.aria-expanded]="store.showCustom()"
      (click)="store.showCustom.set(!store.showCustom())"
      class="mt-2 cursor-pointer"
    >
      + Thêm mốc nhắc
    </button>
    @if (store.showCustom()) {
      <div class="mt-2 flex items-end gap-2">
        <div class="flex-1">
          <app-field label="Số phút tùy chọn"
            ><input
              z-input
              type="number"
              [formControl]="store.customOffset"
              min="0"
              max="10080"
              class="h-11 bg-card md:h-9"
          /></app-field>
        </div>
        <button z-button zType="outline" zSize="lg" type="button" (click)="store.addCustomOffset()" class="h-11 md:h-9">
          Thêm
        </button>
      </div>
    }
    <div class="mt-3">
      <app-field label="Giờ nhắc cho sự kiện cả ngày"
        ><input z-input type="time" [formControl]="store.form.controls.allDayTime" class="h-11 bg-card md:h-9"
      /></app-field>
    </div>
    <p class="mt-4 text-xs font-semibold tracking-wider text-muted-foreground">XEM LẠI</p>
    <div class="mt-2 rounded-xl border border-border bg-card p-4">
      <b class="block text-sm">{{ store.form.controls.title.value || '(chưa có tiêu đề)' }}</b>
      <p class="mt-1.5 text-sm text-muted-foreground">{{ store.reviewLine1() }}</p>
      <p class="text-sm text-muted-foreground">{{ store.reviewLine2() }}</p>
      <p class="text-sm text-muted-foreground">
        {{ store.selectedOffsets().length }} mốc nhắc · {{ store.selectedContacts().length }} người liên quan
      </p>
    </div>
  `,
})
export class StepRemind {
  protected readonly store = inject(EventCreateStore);
}
