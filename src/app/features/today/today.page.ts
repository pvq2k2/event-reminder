import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { liveQuery } from 'dexie';
import { from, switchMap } from 'rxjs';
import { Clock } from '@core/data/clock';
import { EventRepository } from '@core/data/event.repository';
import { NotificationScheduleRepository } from '@core/data/notification-schedule.repository';
import { DEFAULT_SETTINGS, SettingsRepository } from '@core/data/settings.repository';
import { addDays, epochMsToVnLocal, parseIso, vnLocalToEpochMs } from '@core/domain/date';
import { canChiYear, formatLunar, gregorianToLunar } from '@core/domain/lunar';
import type { NotificationSchedule, Occurrence } from '@core/domain/models';
import { ReminderReconciler } from '@core/notifications/reminder-reconciler';
import { NotificationPermissionService } from '@core/notifications/notification-permission.service';
import { ZardAlertComponent } from '@shared/components/alert';
import { ZardButtonComponent } from '@shared/components/button';
import { ZardCardImports } from '@shared/components/card';
import { ZardSonnerService } from '@shared/components/sonner/sonner.service';
import { EmptyState } from '@shared/ui/empty-state';
import { eventCategoryStyle } from '@shared/ui/event-category';
import { AppIcon } from '@shared/ui/icon';
import { formatCountdown, formatRelativeDay, greetingVi } from '@shared/utils/format';
import { TodayHeader } from './today-header';
import { TodayNextCard } from './today-next-card';
import { TodaySidebar, type TodayMonthDay } from './today-sidebar';
import { TodaySkeleton } from './today-skeleton';
import { TodayTimeline } from './today-timeline';
import { buildMonthGrid, buildWeek, pickNext, todayQueryRange } from './today.utils';
import { TodayWeekStrip, type TodayWeekDay } from './today-week-strip';

@Component({
  selector: 'app-today-page',
  imports: [
    RouterLink,
    AppIcon,
    TodayHeader,
    TodayWeekStrip,
    TodayNextCard,
    TodayTimeline,
    TodaySidebar,
    TodaySkeleton,
    EmptyState,
    ZardAlertComponent,
    ZardButtonComponent,
    ...ZardCardImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Host phải block + cao full để khung header-scroll bên trong tính đúng.
  host: { class: 'block h-full min-h-0' },
  template: `
    <div class="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
      <app-today-header
        class="animate-in duration-300 fade-in motion-reduce:animate-none"
        [today]="today()"
        [lunar]="lunar()"
        [canChi]="canChi()"
        [greeting]="greeting()"
        [showLunar]="showLunar()"
      />

      <div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-2 md:p-6 md:pb-3">
        @if (occurrences() === null) {
          <app-today-skeleton />
        } @else {
          <div class="flex flex-col gap-4">
            <app-today-week-strip
              class="animate-in duration-300 fill-mode-both fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
              [days]="weekDays()"
            />

            @if (permission.state() === 'default' || permission.state() === 'denied') {
              <section
                class="flex animate-in flex-col gap-3 rounded-xl border border-border bg-accent p-4 text-accent-foreground delay-75 duration-300 fill-mode-both fade-in slide-in-from-bottom-2 motion-reduce:animate-none sm:flex-row sm:items-center"
                aria-label="Quyền thông báo"
              >
                <span class="text-primary"><app-icon name="bell" [size]="20" /></span>
                <p class="flex-1 text-sm">
                  @if (permission.state() === 'default') {
                    <b>Chưa bật thông báo</b>
                    <span class="text-muted-foreground"> · Chỉ nhắc khi ứng dụng đang mở hoặc đã cài PWA.</span>
                  } @else {
                    <b>Thông báo đang bị chặn</b>
                    <span class="text-muted-foreground"> · Bật lại trong cài đặt trình duyệt để nhận lời nhắc.</span>
                  }
                </p>
                @if (permission.state() === 'default') {
                  <button z-button zSize="lg" type="button" (click)="requestPermission()" class="h-11 shrink-0 md:h-9">
                    Bật thông báo
                  </button>
                } @else {
                  <a z-button zType="outline" zSize="lg" routerLink="/settings" class="h-11 shrink-0 md:h-9">
                    Mở cài đặt
                  </a>
                }
              </section>
            }

            <ng-template #retryTpl>
              <button
                z-button
                zType="outline"
                zSize="sm"
                type="button"
                [zLoading]="retrying()"
                (click)="retryReminders()"
              >
                Thử lại
              </button>
            </ng-template>

            @if (failureCount() > 0) {
              <z-alert
                class="animate-in delay-100 duration-300 fill-mode-both fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
                zType="destructive"
                [zTitle]="'Không đặt được ' + failureCount() + ' lời nhắc'"
                zDescription="Sự kiện vẫn được lưu. Thử lại để cập nhật lịch nhắc."
                [zAction]="retryTpl"
              />
            }

            @if (isEmpty()) {
              <app-empty-state
                class="animate-in delay-100 duration-300 fill-mode-both fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
                icon="calendar"
                title="Hôm nay thảnh thơi"
                description="Chưa có sự kiện nào trong 7 ngày tới. Thêm ngày giỗ, sinh nhật hay lịch hẹn để được nhắc đúng lúc."
                actionLabel="Thêm sự kiện đầu tiên"
                actionLink="/events/new"
              >
                <div class="mt-2 flex flex-wrap justify-center gap-2">
                  <span class="rounded-full bg-event-birthday/20 px-3 py-1 text-xs font-medium text-event-birthday-ink"
                    >Sinh nhật</span
                  >
                  <span class="rounded-full bg-event-memorial/20 px-3 py-1 text-xs font-medium text-event-memorial-ink"
                    >Ngày giỗ</span
                  >
                  <span class="rounded-full bg-event-work/15 px-3 py-1 text-xs font-medium text-event-work-ink"
                    >Lịch hẹn</span
                  >
                </div>
              </app-empty-state>
            } @else {
              <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div class="flex min-w-0 flex-col gap-4">
                  @if (next(); as n) {
                    <app-today-next-card
                      class="animate-in delay-150 duration-300 fill-mode-both fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
                      [next]="n"
                      [countdown]="nextCountdown()"
                      [relative]="nextRelative()"
                      [lunar]="nextLunar()"
                      [showLunar]="showLunar()"
                    />
                  }

                  <z-card
                    class="animate-in delay-200 duration-300 fill-mode-both fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
                  >
                    <z-card-header class="grid-cols-[1fr_auto] items-center">
                      <z-card-title zTitle="Lịch trình hôm nay" />
                      <z-card-action>
                        <span class="text-sm text-muted-foreground">{{ todayItems().length }} sự kiện</span>
                      </z-card-action>
                    </z-card-header>
                    <z-card-content>
                      <app-today-timeline [items]="todayItems()" [failedKeys]="failedKeys()" />
                    </z-card-content>
                  </z-card>
                </div>

                <app-today-sidebar
                  class="animate-in delay-300 duration-300 fill-mode-both fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
                  [today]="today()"
                  [monthLabel]="monthLabel()"
                  [monthDays]="monthDays()"
                  [upcoming]="upcoming()"
                  [weekStartsOn]="weekStartsOn()"
                />
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TodayPage {
  private readonly repo = inject(EventRepository);
  private readonly settingsRepo = inject(SettingsRepository);
  private readonly schedules = inject(NotificationScheduleRepository);
  private readonly clock = inject(Clock);
  private readonly sonner = inject(ZardSonnerService);
  private readonly reconciler = inject(ReminderReconciler);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly permission = inject(NotificationPermissionService);

  /** `now` cập nhật định kỳ để đếm ngược và sang ngày mới mà không cần tải lại. */
  private readonly now = signal(this.clock.now());
  protected readonly retrying = signal(false);

  private readonly settings = toSignal(from(liveQuery(() => this.settingsRepo.get())), {
    initialValue: DEFAULT_SETTINGS,
  });
  private readonly failedSchedules = toSignal(from(liveQuery(() => this.schedules.failed())), {
    initialValue: [] as NotificationSchedule[],
  });

  protected readonly today = computed(() => epochMsToVnLocal(this.now()).date);
  protected readonly weekStartsOn = computed(() => this.settings().weekStartsOn);
  protected readonly showLunar = computed(() => this.settings().showLunarDate);
  private readonly range = computed(() => todayQueryRange(this.today(), this.weekStartsOn()));

  protected readonly occurrences = toSignal<Occurrence[] | null>(
    toObservable(this.range).pipe(switchMap((r) => from(liveQuery(() => this.repo.occurrencesInRange(r.from, r.to))))),
    { initialValue: null },
  );

  private readonly lunarToday = computed(() => gregorianToLunar(this.today()));
  protected readonly lunar = computed(() => formatLunar(this.lunarToday()));
  protected readonly canChi = computed(() => canChiYear(this.lunarToday().year));
  protected readonly greeting = computed(() => greetingVi(Number(epochMsToVnLocal(this.now()).time.slice(0, 2))));

  private readonly byDate = computed(() => {
    const map = new Map<string, Occurrence[]>();
    for (const o of this.occurrences() ?? []) map.set(o.date, [...(map.get(o.date) ?? []), o]);
    return map;
  });

  protected readonly todayItems = computed(() => (this.occurrences() ?? []).filter((o) => o.date === this.today()));

  private readonly sevenDayItems = computed(() => {
    const today = this.today();
    const end = addDays(today, 7);
    return (this.occurrences() ?? []).filter((o) => o.date >= today && o.date <= end);
  });

  protected readonly isEmpty = computed(() => this.occurrences() !== null && this.sevenDayItems().length === 0);

  protected readonly next = computed(() => pickNext(this.sevenDayItems(), this.now()));

  protected readonly nextCountdown = computed(() => {
    const n = this.next();
    if (!n || n.isAllDay || !n.startTime) return '';
    return formatCountdown(vnLocalToEpochMs(n.date, n.startTime) - this.now());
  });

  protected readonly nextRelative = computed(() => {
    const n = this.next();
    return n ? formatRelativeDay(n.date, this.today()) : '';
  });

  protected readonly nextLunar = computed(() => {
    const n = this.next();
    return n ? formatLunar(gregorianToLunar(n.date)) : '';
  });

  protected readonly weekDays = computed<TodayWeekDay[]>(() =>
    buildWeek(this.today(), this.weekStartsOn()).map((d) => ({
      ...d,
      dotClass: this.dotFor(d),
    })),
  );

  protected readonly monthDays = computed<TodayMonthDay[]>(() =>
    buildMonthGrid(this.today(), this.weekStartsOn()).map((d) => ({
      ...d,
      dotClass: this.dotFor(d),
    })),
  );

  protected readonly monthLabel = computed(() => {
    const [year, month] = parseIso(this.today());
    return `Tháng ${month}, ${year}`;
  });

  protected readonly upcoming = computed(() => {
    const today = this.today();
    const end = addDays(today, 7);
    return (this.occurrences() ?? []).filter((o) => o.date > today && o.date <= end);
  });

  private readonly occurrenceKeys = computed(() => new Set((this.occurrences() ?? []).map((o) => o.occurrenceKey)));

  private readonly failedForView = computed(() =>
    this.failedSchedules().filter((s) => this.occurrenceKeys().has(s.occurrenceKey)),
  );

  protected readonly failureCount = computed(() => this.failedForView().length);
  protected readonly failedKeys = computed(() => new Set(this.failedForView().map((s) => s.occurrenceKey)));

  constructor() {
    const timer = setInterval(() => this.now.set(this.clock.now()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected async requestPermission(): Promise<void> {
    const state = await this.permission.request();
    if (state === 'denied') {
      this.sonner.warning('Trình duyệt đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt.');
    }
  }

  protected async retryReminders(): Promise<void> {
    if (this.retrying()) return;
    this.retrying.set(true);
    try {
      await this.reconciler.reconcile();
      this.sonner.success('Đã thử lại lịch nhắc');
    } catch {
      this.sonner.error('Không thử lại được lịch nhắc. Vui lòng thử lại sau.');
    } finally {
      this.retrying.set(false);
    }
  }

  private dotFor(day: { date: string }): string | null {
    const first = this.byDate().get(day.date)?.[0];
    return first ? eventCategoryStyle(first.category).dot : null;
  }
}
