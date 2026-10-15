import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { Clock } from '@core/data/clock';
import { ContactRepository } from '@core/data/contact.repository';
import { EventService } from '@core/data/event.service';
import { SettingsRepository } from '@core/data/settings.repository';
import { addDays, daysInMonth, formatIso, parseIso } from '@core/domain/date';
import { canChiYear, formatLunar, gregorianToLunar, lunarToGregorian } from '@core/domain/lunar';
import type { EventCategory, LeapMonthPolicy, MissingDayPolicy, RecurrenceRule } from '@core/domain/models';
import { getOccurrencesInRange } from '@core/domain/recurrence';
import { validateEventDraft } from '@core/domain/validation';
import { EventValidationError, type NewEvent } from '@core/data/event.repository';
import { ZardAlertComponent } from '@shared/components/alert';
import { ZardButtonComponent } from '@shared/components/button';
import { ZardInputComponent } from '@shared/components/input';
import { inputVariants } from '@shared/components/input/input.variants';
import { ZardSwitchComponent } from '@shared/components/switch';
import { Field } from '@shared/ui/field';
import { AppIcon } from '@shared/ui/icon';
import { WheelPicker, type WheelOption } from '@shared/ui/wheel-picker';
import { ToastService } from '@shared/ui/toast';
import { formatVi, weekdayVi } from '@shared/utils/format';
import { mergeClasses } from '@shared/utils/merge-classes';

const QUICK_OFFSETS = [1440, 60, 30, 0];

type RepeatKind = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly-solar' | 'yearly-lunar';

/** Form tạo sự kiện 4 bước theo design Step1–Step4. Ô nhập, select, công tắc, nút, cảnh báo dùng Zard. */
@Component({
  selector: 'app-event-create-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Field,
    AppIcon,
    ZardButtonComponent,
    ZardInputComponent,
    WheelPicker,
    ZardSwitchComponent,
    ZardAlertComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Host phải block + cao full để khung header-scroll-footer bên trong tính đúng.
  host: { class: 'block h-full min-h-0' },
  template: `
    <form [formGroup]="form" (ngSubmit)="save()" class="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col">
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
            <i class="h-1.5 flex-1 rounded-full" [class.bg-primary]="i <= step()" [class.bg-muted]="i > step()"></i>
          }
        </div>
      </div>

      <div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-6">
        @if (saveError()) {
          <z-alert zType="destructive" [zDescription]="saveError() ?? ''" class="mb-4" />
        }
        @if (step() === 1) {
          <h1 class="text-2xl font-bold tracking-tight">Sự kiện gì vậy?</h1>
          <div class="mt-4">
            <app-field label="Tiêu đề" [error]="titleError()">
              <input
                z-input
                formControlName="title"
                placeholder="Giỗ ông nội"
                autocomplete="off"
                class="h-11 bg-card md:h-9"
              />
            </app-field>
          </div>
          <div class="mt-4">
            <app-field label="Mô tả (không bắt buộc)">
              <textarea
                formControlName="description"
                rows="2"
                placeholder="Cả nhà về sớm phụ dọn cỗ…"
                [class]="textareaCls()"
              ></textarea>
            </app-field>
          </div>
          <p class="mt-4 text-xs font-semibold tracking-wider text-muted-foreground">LOẠI SỰ KIỆN</p>
          <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Loại sự kiện">
            @for (c of categoryOpts; track c.key) {
              <button
                z-button
                [zType]="isCategoryOn(c) ? 'default' : 'secondary'"
                type="button"
                role="radio"
                [attr.aria-checked]="isCategoryOn(c)"
                (click)="pickCategory(c)"
                class="h-11 cursor-pointer rounded-full px-4 text-sm md:h-9"
              >
                {{ c.label }}
              </button>
            }
          </div>
          <p class="mt-4 text-xs font-semibold tracking-wider text-muted-foreground">NGƯỜI LIÊN QUAN</p>
          <div class="mt-2 flex flex-wrap gap-2">
            @for (c of contacts() ?? []; track c.id) {
              <button
                z-button
                [zType]="selectedContacts().includes(c.id) ? 'default' : 'secondary'"
                type="button"
                (click)="toggleContact(c.id)"
                [attr.aria-pressed]="selectedContacts().includes(c.id)"
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
                <input z-input formControlName="location" placeholder="Nhà bác cả" class="h-11 bg-card pr-10 md:h-9" />
                <span
                  class="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center text-muted-foreground"
                >
                  <app-icon name="pin" [size]="18" />
                </span>
              </div>
            </app-field>
          </div>
        }

        @if (step() === 2) {
          <h1 class="text-2xl font-bold tracking-tight">Khi nào diễn ra?</h1>
          <div class="relative mt-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Lịch">
            <span
              aria-hidden="true"
              class="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-background shadow-sm transition-transform duration-200 motion-reduce:transition-none"
              [class.translate-x-full]="form.controls.calendarSystem.value === 'lunar'"
            ></span>
            @for (s of systems; track s.id) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="form.controls.calendarSystem.value === s.id"
                (click)="form.controls.calendarSystem.setValue(s.id)"
                class="relative rounded-md py-2 text-sm font-medium"
                [class.text-muted-foreground]="form.controls.calendarSystem.value !== s.id"
              >
                {{ s.label }}
              </button>
            }
          </div>
          @if (form.controls.calendarSystem.value === 'gregorian') {
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
                    [options]="gregDayOpts()"
                    [value]="gregParts().d"
                    (valueChange)="setGregPart('d', $event)"
                  />
                  <app-wheel-picker
                    bare
                    label="Tháng dương"
                    [options]="gregMonthOpts"
                    [value]="gregParts().m"
                    (valueChange)="setGregPart('m', $event)"
                  />
                  <app-wheel-picker
                    bare
                    label="Năm dương"
                    [options]="gregYearOpts"
                    [value]="gregParts().y"
                    (valueChange)="setGregPart('y', $event)"
                  />
                </div>
              </div>
            </div>
            <p class="mt-2 rounded-lg bg-muted p-3 text-sm">
              = <b>{{ lunarLine() }}</b>
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
                    [options]="lunarDayOpts"
                    [value]="str(form.controls.lunarDay.value)"
                    (valueChange)="setLunarPart('lunarDay', $event)"
                  />
                  <app-wheel-picker
                    bare
                    label="Tháng âm"
                    [options]="lunarMonthOpts"
                    [value]="str(form.controls.lunarMonth.value)"
                    (valueChange)="setLunarPart('lunarMonth', $event)"
                  />
                  <app-wheel-picker
                    bare
                    label="Năm âm"
                    [options]="lunarYearOpts"
                    [value]="str(form.controls.lunarYear.value)"
                    (valueChange)="setLunarPart('lunarYear', $event)"
                  />
                </div>
              </div>
            </div>
            @if (lunarResolved() === null) {
              <z-alert
                zType="destructive"
                zDescription="Ngày âm này không tồn tại trong năm đã chọn (tháng nhuận không có hoặc tháng thiếu ngày 30). Hãy đổi ngày."
                class="mt-2"
              />
            } @else {
              <p class="mt-2 rounded-lg bg-muted p-3 text-sm">
                = <b>{{ weekdayVi(lunarResolved()!) }}, {{ formatVi(lunarResolved()!) }}</b> dương lịch · năm
                {{ canChi(lunarYearVal()) }}
              </p>
            }
            <div class="mt-2 flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <span class="text-sm font-medium">Tháng nhuận</span>
              <z-switch formControlName="isLeapMonth"><span class="sr-only">Tháng nhuận</span></z-switch>
            </div>
          }
          <div class="mt-2 flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <span class="text-sm font-medium">Cả ngày</span>
            <z-switch formControlName="isAllDay"><span class="sr-only">Cả ngày</span></z-switch>
          </div>
          @if (!form.controls.isAllDay.value) {
            <div class="mt-2 grid grid-cols-2 gap-2">
              <app-field label="Bắt đầu" [error]="timeError()"
                ><input z-input type="time" formControlName="startTime" class="h-11 bg-card md:h-9"
              /></app-field>
              <app-field label="Kết thúc"
                ><input z-input type="time" formControlName="endTime" class="h-11 bg-card md:h-9"
              /></app-field>
            </div>
          }
        }

        @if (step() === 3) {
          <h1 class="text-2xl font-bold tracking-tight">Có lặp lại không?</h1>
          <div class="mt-3 grid gap-2" role="radiogroup" aria-label="Kiểu lặp">
            @for (r of repeats; track r.id) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="repeatKind() === r.id"
                (click)="setRepeat(r.id)"
                class="rounded-xl border p-3 text-left"
                [class.border-primary]="repeatKind() === r.id"
                [class.border-border]="repeatKind() !== r.id"
                [class.bg-accent]="repeatKind() === r.id"
              >
                <b class="block text-sm">{{ r.label }}</b
                ><span class="text-xs text-muted-foreground">{{ r.hint }}</span>
              </button>
            }
          </div>
          @if (repeatKind() === 'daily') {
            <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">CHI TIẾT</p>
            <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Chi tiết lặp">
              @for (s of subKindOpts; track s.id) {
                <button
                  z-button
                  [zType]="form.controls.subKind.value === s.id ? 'default' : 'secondary'"
                  type="button"
                  role="radio"
                  [attr.aria-checked]="form.controls.subKind.value === s.id"
                  (click)="form.controls.subKind.setValue(s.id)"
                  class="h-11 rounded-full px-4 text-sm md:h-9"
                >
                  {{ s.label }}
                </button>
              }
            </div>
            <div class="mt-2 flex items-center gap-2">
              <div class="w-28">
                <app-field label="Mỗi"
                  ><input z-input type="number" formControlName="interval" min="1" class="h-11 bg-card md:h-9"
                /></app-field>
              </div>
              <p class="pt-6 text-sm text-muted-foreground">{{ intervalUnit() }}</p>
            </div>
          }
          @if (showWeekdays()) {
            <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">THỨ TRONG TUẦN</p>
            <div class="mt-2 flex flex-wrap gap-2">
              @for (d of weekOpts; track d.v) {
                <button
                  z-button
                  [zType]="selectedWeekdays().includes(d.v) ? 'default' : 'secondary'"
                  type="button"
                  (click)="toggleWeekday(d.v)"
                  [attr.aria-pressed]="selectedWeekdays().includes(d.v)"
                  class="h-11 rounded-full px-4 text-sm md:h-9"
                >
                  {{ d.label }}
                </button>
              }
            </div>
          }
          @if (repeatKind() === 'yearly-lunar') {
            <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">
              NẾU NĂM ĐÓ KHÔNG CÓ THÁNG NÀY (THÁNG NHUẬN)
            </p>
            <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Tháng nhuận">
              @for (p of leapOpts; track p.id) {
                <button
                  z-button
                  [zType]="form.controls.leapPolicy.value === p.id ? 'default' : 'secondary'"
                  type="button"
                  role="radio"
                  [attr.aria-checked]="form.controls.leapPolicy.value === p.id"
                  (click)="form.controls.leapPolicy.setValue(p.id)"
                  class="h-11 rounded-full px-4 text-sm md:h-9"
                >
                  {{ p.label }}
                </button>
              }
            </div>
          }
          @if (showMissingDay()) {
            <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">THÁNG THIẾU NGÀY</p>
            <div class="mt-2 flex flex-wrap gap-2">
              @for (p of missingOpts; track p.id) {
                <button
                  z-button
                  [zType]="form.controls.missingDay.value === p.id ? 'default' : 'secondary'"
                  type="button"
                  (click)="form.controls.missingDay.setValue(p.id)"
                  class="h-11 rounded-full px-4 text-sm md:h-9"
                >
                  {{ p.label }}
                </button>
              }
            </div>
            <p class="mt-2 text-xs text-muted-foreground">Ngày {{ monthDayHint() }} hằng tháng.</p>
          }
          @if (repeatKind() !== 'none') {
            <p class="mt-3 text-xs font-semibold tracking-wider text-muted-foreground">KẾT THÚC</p>
            <div class="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Kết thúc">
              @for (e of endOpts; track e.id) {
                <button
                  z-button
                  [zType]="endType() === e.id ? 'default' : 'secondary'"
                  type="button"
                  role="radio"
                  [attr.aria-checked]="endType() === e.id"
                  (click)="setEnd(e.id)"
                  class="h-11 rounded-full px-4 text-sm md:h-9"
                >
                  {{ e.label }}
                </button>
              }
            </div>
            @if (endType() === 'until') {
              <div class="mt-2">
                <app-field label="Kết thúc vào ngày"
                  ><input z-input type="date" formControlName="endConditionDate" class="h-11 bg-card md:h-9"
                /></app-field>
              </div>
            }
            @if (endType() === 'count') {
              <div class="mt-2">
                <app-field label="Sau N lần"
                  ><input z-input type="number" formControlName="endConditionCount" min="1" class="h-11 bg-card md:h-9"
                /></app-field>
              </div>
            }
            <div class="mt-3 rounded-xl border border-border bg-card p-3">
              <b class="text-sm">5 lần tới</b>
              @for (o of preview(); track o.occurrenceKey) {
                <p class="mt-1 text-sm text-muted-foreground">{{ formatVi(o.date) }} · {{ weekdayVi(o.date) }}</p>
              } @empty {
                <p class="mt-1 text-sm text-muted-foreground">Chưa có lần nào trong 5 năm tới với quy tắc này.</p>
              }
            </div>
          }
          @if (ruleError()) {
            <z-alert zType="destructive" [zDescription]="ruleError() ?? ''" class="mt-2" />
          }
        }

        @if (step() === 4) {
          <h1 class="text-2xl font-bold tracking-tight">Nhắc bạn lúc nào?</h1>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (o of selectedOffsets(); track o) {
              <button
                z-button
                type="button"
                (click)="toggleOffset(o)"
                [attr.aria-label]="offsetLabel(o) + ', bấm để gỡ'"
                class="h-11 rounded-full px-4 text-sm md:h-9"
              >
                {{ offsetLabel(o) }} <app-icon name="x" [size]="14" />
              </button>
            } @empty {
              <p class="text-sm text-muted-foreground">Chưa có mốc nhắc nào.</p>
            }
          </div>
          @if (addableOffsets().length) {
            <p class="mt-4 text-xs font-semibold tracking-wider text-muted-foreground">THÊM MỐC NHẮC</p>
            <div class="mt-2 flex flex-wrap gap-2">
              @for (o of addableOffsets(); track o) {
                <button
                  z-button
                  zType="secondary"
                  type="button"
                  (click)="toggleOffset(o)"
                  class="h-11 rounded-full px-4 text-sm md:h-9"
                >
                  + {{ offsetLabel(o) }}
                </button>
              }
            </div>
          }
          <div class="mt-3 flex items-end gap-2">
            <div class="flex-1">
              <app-field label="Số phút tùy chọn"
                ><input
                  z-input
                  type="number"
                  [formControl]="customOffset"
                  min="0"
                  max="10080"
                  class="h-11 bg-card md:h-9"
              /></app-field>
            </div>
            <button z-button zType="outline" zSize="lg" type="button" (click)="addCustomOffset()" class="h-11 md:h-9">
              Thêm
            </button>
          </div>
          <div class="mt-3">
            <app-field label="Giờ nhắc cho sự kiện cả ngày"
              ><input z-input type="time" formControlName="allDayTime" class="h-11 bg-card md:h-9"
            /></app-field>
          </div>
          <div class="mt-4 rounded-xl border border-border bg-card p-4">
            <b class="text-sm">Xem lại</b>
            <p class="mt-1 text-sm font-semibold">{{ form.controls.title.value || '(chưa có tiêu đề)' }}</p>
            <p class="text-sm text-muted-foreground">{{ summary() }}</p>
            <p class="text-sm text-muted-foreground">
              {{ selectedOffsets().length }} mốc nhắc · {{ selectedContacts().length }} người liên quan
            </p>
          </div>
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
  private readonly contactsRepo = inject(ContactRepository);
  private readonly settings = inject(SettingsRepository);
  private readonly clock = inject(Clock);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly step = signal(1);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly quickOffsets = QUICK_OFFSETS;
  /** "Họp mặt" trong design dùng chung giá trị `other` với "Khác" (model chỉ có 4 loại). */
  protected readonly categoryOpts: readonly { key: string; label: string; value: EventCategory }[] = [
    { key: 'work', label: 'Công việc', value: 'work' },
    { key: 'birthday', label: 'Sinh nhật', value: 'birthday' },
    { key: 'memorial', label: 'Giỗ', value: 'memorial' },
    { key: 'meeting', label: 'Họp mặt', value: 'other' },
    { key: 'other', label: 'Khác', value: 'other' },
  ];
  protected readonly otherLabel = signal<'meeting' | 'other'>('other');
  protected readonly systems = [
    { id: 'gregorian', label: 'Dương lịch' },
    { id: 'lunar', label: 'Âm lịch' },
  ] as const;
  protected readonly repeats: readonly { id: RepeatKind; label: string; hint: string }[] = [
    { id: 'none', label: 'Không lặp', hint: 'Chỉ diễn ra một lần' },
    { id: 'daily', label: 'Hằng ngày / tuần / tháng', hint: 'Chọn khoảng cách và thứ trong tuần' },
    { id: 'yearly-lunar', label: 'Hằng năm theo âm lịch', hint: 'Mỗi 29/8 âm lịch · hợp cho giỗ, rằm' },
    { id: 'yearly-solar', label: 'Hằng năm theo dương lịch', hint: 'Hợp cho sinh nhật, kỷ niệm' },
  ];
  protected readonly subKindOpts = [
    { id: 'daily', label: 'Hằng ngày' },
    { id: 'weekly', label: 'Hằng tuần' },
    { id: 'monthly', label: 'Hằng tháng' },
  ] as const;
  protected readonly weekOpts = [
    { v: 1, label: 'T2' },
    { v: 2, label: 'T3' },
    { v: 3, label: 'T4' },
    { v: 4, label: 'T5' },
    { v: 5, label: 'T6' },
    { v: 6, label: 'T7' },
    { v: 0, label: 'CN' },
  ];
  protected readonly leapOpts: readonly { id: LeapMonthPolicy; label: string }[] = [
    { id: 'regular', label: 'Tháng thường' },
    { id: 'leap', label: 'Tháng nhuận' },
    { id: 'both', label: 'Cả hai' },
  ];
  protected readonly missingOpts: readonly { id: MissingDayPolicy; label: string }[] = [
    { id: 'clamp', label: 'Dồn về cuối tháng' },
    { id: 'skip', label: 'Bỏ qua tháng thiếu' },
  ];
  protected readonly endOpts = [
    { id: 'never', label: 'Không bao giờ' },
    { id: 'until', label: 'Vào ngày' },
    { id: 'count', label: 'Sau N lần' },
  ] as const;
  protected readonly lunarDayOpts = EventCreatePage.nums(30);
  protected readonly lunarMonthOpts = EventCreatePage.nums(12);
  protected readonly gregMonthOpts = EventCreatePage.nums(12);
  protected readonly lunarYearOpts: readonly WheelOption[] = (() => {
    const y = Number(this.clock.todayIso().slice(0, 4));
    return Array.from({ length: 16 }, (_, i) => ({ value: String(y - 5 + i), label: String(y - 5 + i) }));
  })();
  protected readonly gregYearOpts: readonly WheelOption[] = (() => {
    const y = Number(this.clock.todayIso().slice(0, 4));
    return Array.from({ length: 111 }, (_, i) => ({ value: String(y - 100 + i), label: String(y - 100 + i) }));
  })();

  private static nums(n: number): readonly WheelOption[] {
    return Array.from({ length: n }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  }

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    category: new FormControl<EventCategory>('memorial', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    calendarSystem: new FormControl<'gregorian' | 'lunar'>('lunar', { nonNullable: true }),
    startDate: new FormControl(this.clock.todayIso(), { nonNullable: true }),
    lunarDay: new FormControl(29, { nonNullable: true }),
    lunarMonth: new FormControl(8, { nonNullable: true }),
    lunarYear: new FormControl(2026, { nonNullable: true }),
    isLeapMonth: new FormControl(false, { nonNullable: true }),
    isAllDay: new FormControl(false, { nonNullable: true }),
    startTime: new FormControl('19:00', { nonNullable: true }),
    endTime: new FormControl('21:00', { nonNullable: true }),
    repeatKind: new FormControl<RepeatKind>('yearly-lunar', { nonNullable: true }),
    subKind: new FormControl<'daily' | 'weekly' | 'monthly'>('monthly', { nonNullable: true }),
    interval: new FormControl(1, { nonNullable: true }),
    leapPolicy: new FormControl<LeapMonthPolicy>('regular', { nonNullable: true }),
    missingDay: new FormControl<MissingDayPolicy>('clamp', { nonNullable: true }),
    endType: new FormControl<'never' | 'until' | 'count'>('never', { nonNullable: true }),
    endConditionDate: new FormControl('', { nonNullable: true }),
    endConditionCount: new FormControl(10, { nonNullable: true }),
    allDayTime: new FormControl('09:00', { nonNullable: true }),
  });
  protected readonly customOffset = new FormControl(60, { nonNullable: true });

  protected readonly contacts = toSignal<{ id: string; displayName: string }[] | null>(
    from(
      liveQuery(() =>
        this.contactsRepo
          .tree()
          .then((g) => g.flatMap((x) => x.families.flatMap((f) => f.members.map((m) => m.contact)))),
      ),
    ),
    { initialValue: null },
  );
  protected readonly selectedContacts = signal<string[]>([]);
  protected readonly selectedWeekdays = signal<number[]>([5]);
  protected readonly selectedOffsets = signal<number[]>([1440, 60, 30]);
  protected readonly addableOffsets = computed(() => QUICK_OFFSETS.filter((o) => !this.selectedOffsets().includes(o)));
  // Các getter dưới là method (không phải computed) vì giá trị form không phải
  // signal: computed sẽ chỉ tính một lần và kẹt mãi giá trị đầu.
  protected repeatKind(): RepeatKind {
    return this.form.controls.repeatKind.value;
  }
  protected endType(): 'never' | 'until' | 'count' {
    return this.form.controls.endType.value;
  }
  protected lunarYearVal(): number {
    return this.form.controls.lunarYear.value;
  }
  protected showWeekdays(): boolean {
    return (
      this.repeatKind() === 'weekly' || (this.repeatKind() === 'daily' && this.form.controls.subKind.value === 'weekly')
    );
  }
  protected showMissingDay(): boolean {
    return (
      this.repeatKind() === 'monthly' ||
      (this.repeatKind() === 'daily' && this.form.controls.subKind.value === 'monthly')
    );
  }
  protected intervalUnit(): string {
    switch (this.form.controls.subKind.value) {
      case 'weekly':
        return 'tuần';
      case 'monthly':
        return 'tháng';
      default:
        return 'ngày';
    }
  }
  protected monthDayHint(): number {
    try {
      return parseIso(this.lunarResolved() ?? this.clock.todayIso())[2];
    } catch {
      return this.form.controls.lunarDay.value;
    }
  }

  protected lunarResolved(): string | null {
    if (this.form.controls.calendarSystem.value !== 'lunar') return this.form.controls.startDate.value;
    return lunarToGregorian({
      day: this.form.controls.lunarDay.value,
      month: this.form.controls.lunarMonth.value,
      year: this.form.controls.lunarYear.value,
      isLeapMonth: this.form.controls.isLeapMonth.value,
    });
  }

  protected lunarLine(): string {
    try {
      const l = gregorianToLunar(this.form.controls.startDate.value || this.clock.todayIso());
      return `${formatLunar(l, true)}`;
    } catch {
      return '';
    }
  }

  protected titleError(): string | null {
    const c = this.form.controls.title;
    if (!c.touched && !c.dirty) return null;
    if (c.hasError('required')) return 'Tiêu đề không được để trống';
    if (c.hasError('maxlength')) return 'Tiêu đề tối đa 200 ký tự';
    return null;
  }
  protected dateError(): string | null {
    return /^\d{4}-\d{2}-\d{2}$/.test(this.form.controls.startDate.value) ? null : 'Ngày bắt đầu không hợp lệ';
  }
  protected timeError(): string | null {
    if (this.form.controls.isAllDay.value) return null;
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(this.form.controls.startTime.value)
      ? null
      : 'Cần giờ bắt đầu cho sự kiện không cả ngày';
  }
  protected ruleError(): string | null {
    try {
      const e = validateEventDraft(this.draft());
      return e.rule ?? null;
    } catch {
      return null;
    }
  }

  protected preview(): ReturnType<typeof getOccurrencesInRange> {
    try {
      const d = this.draft();
      const fake = {
        id: 'preview',
        title: d.title || 'x',
        startDate: d.startDate,
        startTime: d.startTime,
        endTime: d.endTime,
        isAllDay: d.isAllDay,
        rule: d.rule,
        category: this.form.controls.category.value,
      } as Parameters<typeof getOccurrencesInRange>[0];
      return getOccurrencesInRange(fake, d.startDate, addDays(d.startDate, 1825)).slice(0, 5);
    } catch {
      return [];
    }
  }

  protected summary(): string {
    const sys =
      this.form.controls.calendarSystem.value === 'lunar'
        ? `âm ${this.form.controls.lunarDay.value}/${this.form.controls.lunarMonth.value}`
        : formatVi(this.form.controls.startDate.value || '');
    const time = this.form.controls.isAllDay.value
      ? 'cả ngày'
      : `${this.form.controls.startTime.value}–${this.form.controls.endTime.value}`;
    return `${sys} · ${time} · ${this.repeats.find((r) => r.id === this.repeatKind())?.label ?? ''}`;
  }

  protected canChi = (y: number) => canChiYear(y);
  protected formatVi = formatVi;
  protected weekdayVi = weekdayVi;
  protected str = (v: number): string => String(v);
  /** Textarea ké style từ z-input (Zard chưa có textarea) để không bao giờ lệch. */
  protected textareaCls(): string {
    return mergeClasses(inputVariants(), 'h-auto min-h-24 bg-card py-2');
  }
  protected offsetLabel(o: number): string {
    if (o === 0) return 'Đúng giờ';
    if (o >= 1440) return `Trước ${Math.floor(o / 1440)} ngày`;
    if (o >= 60) return `Trước ${Math.floor(o / 60)} giờ`;
    return `Trước ${o} phút`;
  }

  protected isCategoryOn(c: { key: string; value: EventCategory }): boolean {
    if (this.form.controls.category.value !== c.value) return false;
    return c.value !== 'other' || this.otherLabel() === c.key;
  }
  protected pickCategory(c: { key: string; value: EventCategory }): void {
    this.form.controls.category.setValue(c.value);
    if (c.value === 'other') this.otherLabel.set(c.key === 'meeting' ? 'meeting' : 'other');
  }
  protected setLunarPart(part: 'lunarDay' | 'lunarMonth' | 'lunarYear', v: string): void {
    const n = Number(v);
    if (Number.isInteger(n)) this.form.controls[part].setValue(n);
  }
  /** Tách ngày dương `YYYY-MM-DD` (không pad) để đưa vào bánh xe. */
  protected gregParts(): { y: string; m: string; d: string } {
    const raw = this.form.controls.startDate.value || this.clock.todayIso();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw) ?? /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.clock.todayIso());
    if (!m) return { y: '2026', m: '1', d: '1' };
    return { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) };
  }
  protected gregDayOpts(): readonly WheelOption[] {
    const p = this.gregParts();
    return EventCreatePage.nums(daysInMonth(Number(p.y), Number(p.m)));
  }
  protected setGregPart(part: 'y' | 'm' | 'd', v: string): void {
    const p = this.gregParts();
    const y = Math.min(2200, Math.max(1900, Number(part === 'y' ? v : p.y)));
    const m = Math.min(12, Math.max(1, Number(part === 'm' ? v : p.m)));
    const d = Math.min(daysInMonth(y, m), Math.max(1, Number(part === 'd' ? v : p.d)));
    if (![y, m, d].every(Number.isInteger)) return;
    this.form.controls.startDate.setValue(formatIso(y, m, d));
  }
  protected toggleContact(id: string): void {
    this.selectedContacts.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  protected toggleWeekday(v: number): void {
    this.selectedWeekdays.update((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }
  protected toggleOffset(o: number): void {
    this.selectedOffsets.update((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]));
  }
  protected addCustomOffset(): void {
    const n = Math.round(Math.min(10080, Math.max(0, this.customOffset.value ?? 0)));
    this.selectedOffsets.update((s) => (s.includes(n) ? s : [...s, n]));
  }
  protected setRepeat(id: RepeatKind): void {
    this.form.controls.repeatKind.setValue(id);
    if (id === 'daily') this.form.controls.subKind.setValue('monthly');
  }
  protected setEnd(id: 'never' | 'until' | 'count'): void {
    this.form.controls.endType.setValue(id);
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
    if (this.step() === 1 && !this.form.controls.title.value.trim()) {
      this.form.controls.title.markAsTouched();
      return;
    }
    if (this.step() === 2) {
      if (this.form.controls.calendarSystem.value === 'lunar' && this.lunarResolved() === null) return;
      if (this.dateError() || this.timeError()) return;
    }
    this.step.update((s) => Math.min(4, s + 1));
  }
  protected prev(): void {
    this.step.update((s) => Math.max(1, s - 1));
  }

  private draft(): {
    title: string;
    startDate: string;
    startTime: string | null;
    endTime?: string | null;
    isAllDay: boolean;
    rule: RecurrenceRule;
  } {
    const v = this.form.getRawValue();
    const resolved = v.calendarSystem === 'lunar' ? (this.lunarResolved() ?? '0000-00-00') : v.startDate;
    const end: RecurrenceRule extends never
      ? never
      : { type: 'never' } | { type: 'until'; date: string } | { type: 'count'; count: number } =
      v.endType === 'until'
        ? { type: 'until', date: v.endConditionDate || resolved }
        : v.endType === 'count'
          ? { type: 'count', count: Math.max(1, v.endConditionCount) }
          : { type: 'never' };
    let rule: RecurrenceRule = { kind: 'none' };
    const rk = v.repeatKind;
    if (rk === 'daily') {
      const sub = v.subKind;
      if (sub === 'weekly')
        rule = { kind: 'weekly', interval: Math.max(1, v.interval), weekdays: this.selectedWeekdays(), end };
      else if (sub === 'monthly') {
        const [, , day] = parseIso(resolved);
        rule = { kind: 'monthly', interval: Math.max(1, v.interval), monthDay: day, missingDay: v.missingDay, end };
      } else rule = { kind: 'daily', interval: Math.max(1, v.interval), end };
    } else if (rk === 'weekly') {
      rule = { kind: 'weekly', interval: Math.max(1, v.interval), weekdays: this.selectedWeekdays(), end };
    } else if (rk === 'monthly') {
      const [, , day] = parseIso(resolved);
      rule = { kind: 'monthly', interval: Math.max(1, v.interval), monthDay: day, missingDay: v.missingDay, end };
    } else if (rk === 'yearly-solar') {
      const [, m, d] = parseIso(resolved);
      rule = { kind: 'yearly-solar', interval: 1, month: m, day: d, end };
    } else if (rk === 'yearly-lunar') {
      rule = {
        kind: 'yearly-lunar',
        interval: 1,
        lunarMonth: v.calendarSystem === 'lunar' ? v.lunarMonth : gregorianToLunar(resolved).month,
        lunarDay: v.calendarSystem === 'lunar' ? v.lunarDay : gregorianToLunar(resolved).day,
        leapPolicy: v.leapPolicy,
        end,
      };
    }
    return {
      title: v.title.trim(),
      startDate: resolved,
      startTime: v.isAllDay ? null : v.startTime,
      endTime: v.isAllDay ? null : v.endTime || undefined,
      isAllDay: v.isAllDay,
      rule,
    };
  }

  private payload(quick: boolean): NewEvent {
    const v = this.form.getRawValue();
    const d = quick ? { ...this.draft(), rule: { kind: 'none' } as RecurrenceRule } : this.draft();
    return {
      title: d.title,
      description: v.description || undefined,
      location: v.location || undefined,
      startDate: d.startDate,
      startTime: d.startTime,
      endTime: d.endTime,
      timezone: 'Asia/Ho_Chi_Minh',
      isAllDay: d.isAllDay,
      calendarSystem: v.calendarSystem,
      category: v.category,
      rule: d.rule,
      reminders: (quick ? [30, 1440] : this.selectedOffsets()).map((offsetMinutes, i) => ({
        id: crypto.randomUUID() || `r${i}`,
        offsetMinutes,
        enabled: true,
      })),
      exceptions: [],
      contactIds: [...this.selectedContacts()],
    };
  }

  protected async quickSave(): Promise<void> {
    if (!this.form.controls.title.value.trim()) {
      this.form.controls.title.markAsTouched();
      this.step.set(1);
      return;
    }
    await this.persist(this.payload(true));
  }

  protected async save(): Promise<void> {
    if (this.step() < 4) return;
    await this.persist(this.payload(false));
  }

  private async persist(input: NewEvent): Promise<void> {
    this.saveError.set(null);
    this.saving.set(true);
    try {
      const created = await this.events.create(input);
      try {
        const s = await this.settings.get();
        if (input.isAllDay && this.form.controls.allDayTime.value !== s.allDayReminderTime) {
          await this.settings.update({ allDayReminderTime: this.form.controls.allDayTime.value });
        }
      } catch {
        /* giữ allDayReminderTime cũ khi settings lỗi */
      }
      this.toast.show('Đã tạo sự kiện');
      await this.router.navigate(['/events', created.id]);
    } catch (e) {
      if (e instanceof EventValidationError) {
        const keys = Object.keys(e.errors);
        this.saveError.set(Object.values(e.errors)[0] ?? 'Dữ liệu không hợp lệ');
        if (keys.includes('title')) this.step.set(1);
        else if (keys.some((k) => ['startDate', 'endTime'].includes(k))) this.step.set(2);
        else if (keys.includes('rule')) this.step.set(3);
        else this.step.set(4);
      } else {
        this.saveError.set('Không lưu được sự kiện. Hãy thử lại.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
