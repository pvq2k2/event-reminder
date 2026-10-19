import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ZardButtonComponent } from '@shared/components/button';
import { ZardInputComponent } from '@shared/components/input';
import { Field } from '@shared/ui/field';
import { AppIcon } from '@shared/ui/icon';
import { EventCreateStore } from './event-create.store';

/** Bước 1/4 — tiêu đề, mô tả, loại sự kiện, người liên quan, địa điểm. */
@Component({
  selector: 'app-step-basics',
  imports: [ReactiveFormsModule, Field, AppIcon, ZardButtonComponent, ZardInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <h1 class="text-2xl font-bold tracking-tight">Sự kiện gì vậy?</h1>
    <div class="mt-4">
      <app-field label="Tiêu đề" [error]="store.titleError()">
        <input
          z-input
          [formControl]="store.form.controls.title"
          placeholder="Giỗ ông nội"
          autocomplete="off"
          class="h-11 bg-card md:h-9"
        />
      </app-field>
    </div>
    <div class="mt-4">
      <app-field label="Mô tả (không bắt buộc)">
        <textarea
          [formControl]="store.form.controls.description"
          rows="2"
          placeholder="Cả nhà về sớm phụ dọn cỗ…"
          [class]="store.textareaCls()"
        ></textarea>
      </app-field>
    </div>
    <p class="mt-4 text-xs font-semibold tracking-wider text-muted-foreground">LOẠI SỰ KIỆN</p>
    <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Loại sự kiện">
      @for (c of store.categoryOpts; track c.key) {
        <button
          z-button
          [zType]="store.isCategoryOn(c) ? 'default' : 'secondary'"
          type="button"
          role="radio"
          [attr.aria-checked]="store.isCategoryOn(c)"
          (click)="store.pickCategory(c)"
          class="h-11 cursor-pointer rounded-full px-4 text-sm md:h-9"
        >
          {{ c.label }}
        </button>
      }
    </div>
    <p class="mt-4 text-xs font-semibold tracking-wider text-muted-foreground">NGƯỜI LIÊN QUAN</p>
    <div class="mt-2 flex flex-wrap gap-2">
      @for (c of store.contacts() ?? []; track c.id) {
        <button
          z-button
          [zType]="store.selectedContacts().includes(c.id) ? 'default' : 'secondary'"
          type="button"
          (click)="store.toggleContact(c.id)"
          [attr.aria-pressed]="store.selectedContacts().includes(c.id)"
          class="h-11 rounded-full px-4 text-sm md:h-9"
        >
          {{ c.displayName }}
        </button>
      } @empty {
        <p class="text-sm text-muted-foreground">Chưa có liên hệ. Thêm ở Danh bạ trước.</p>
      }
    </div>
    <div class="mt-4">
      <app-field label="Địa điểm">
        <div class="relative">
          <input
            z-input
            [formControl]="store.form.controls.location"
            placeholder="Nhà bác cả"
            class="h-11 bg-card pr-10 md:h-9"
          />
          <span
            class="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center text-muted-foreground"
          >
            <app-icon name="pin" [size]="18" />
          </span>
        </div>
      </app-field>
    </div>
  `,
})
export class StepBasics {
  protected readonly store = inject(EventCreateStore);
}
