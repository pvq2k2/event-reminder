import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Clock } from '@core/data/clock';
import { APP_DB, AppDb } from '@core/data/db';
import { EventRepository, type NewEvent } from '@core/data/event.repository';
import { vnLocalToEpochMs } from '@core/domain/date';
import {
  NotificationPermissionService,
  type PermissionState,
} from '@core/notifications/notification-permission.service';
import { ReminderReconciler } from '@core/notifications/reminder-reconciler';
import { TodayPage } from './today.page';

const NOW = vnLocalToEpochMs('2026-10-09', '08:00');

const clock = {
  now: () => NOW,
  todayIso: () => '2026-10-09',
  nowTime: () => '08:00',
};

const event = (over: Partial<NewEvent> = {}): NewEvent => ({
  title: 'Họp nhóm',
  startDate: '2026-10-09',
  startTime: '09:00',
  isAllDay: false,
  calendarSystem: 'gregorian',
  category: 'work',
  location: 'Văn phòng',
  rule: { kind: 'none' },
  reminders: [{ id: 'r1', offsetMinutes: 30, enabled: true }],
  exceptions: [],
  contactIds: [],
  ...over,
});

let db: AppDb;
let reconcile: ReturnType<typeof vi.fn>;
let permissionRequest: ReturnType<typeof vi.fn>;

beforeEach(() => {
  db = new AppDb(`today-${crypto.randomUUID()}`);
  reconcile = vi.fn().mockResolvedValue(undefined);
  permissionRequest = vi.fn().mockResolvedValue('granted');
});

async function configure(permissionState: PermissionState = 'granted'): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [TodayPage],
    providers: [
      provideRouter([]),
      { provide: APP_DB, useValue: db },
      { provide: Clock, useValue: clock },
      { provide: ReminderReconciler, useValue: { reconcile } },
      {
        provide: NotificationPermissionService,
        useValue: { state: signal(permissionState), request: permissionRequest },
      },
    ],
  }).compileComponents();
}

async function render(): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(TodayPage);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

async function waitForText(element: HTMLElement, text: string): Promise<void> {
  await vi.waitFor(() => {
    expect(element.textContent).toContain(text);
  });
}

describe('TodayPage', () => {
  it('hiện skeleton khi dữ liệu còn đang tải', async () => {
    await configure();
    const el = await render();
    expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('hiện trạng thái trống khi không có sự kiện trong 7 ngày', async () => {
    await configure();
    const el = await render();
    await waitForText(el, 'Hôm nay thảnh thơi');
    expect(el.textContent).toContain('Thêm sự kiện đầu tiên');
  });

  it('hiện sự kiện tiếp theo, lịch trình, lịch tháng và 7 ngày tới', async () => {
    await configure();
    const repo = TestBed.inject(EventRepository);
    const meeting = await repo.create(event());
    await repo.create(
      event({
        title: 'Giỗ ông nội',
        startTime: '19:00',
        category: 'memorial',
        location: 'Nhà bác cả',
        reminders: [{ id: 'r1', offsetMinutes: 1440, enabled: true }],
      }),
    );
    await repo.create(
      event({
        title: 'Sinh nhật bà ngoại',
        startDate: '2026-10-10',
        startTime: null,
        isAllDay: true,
        category: 'birthday',
        reminders: [],
      }),
    );

    const el = await render();
    await waitForText(el, 'Họp nhóm');
    expect(el.textContent).toContain('Sự kiện tiếp theo');
    expect(el.textContent).toContain('2 sự kiện');
    expect(el.textContent).toContain('Lịch trình hôm nay');
    expect(el.textContent).toContain('Tháng 10, 2026');
    expect(el.textContent).toContain('7 ngày tới');
    expect(el.textContent).toContain('Sinh nhật bà ngoại');
    expect(el.querySelector(`a[href="/events/${meeting.id}"]`)).not.toBeNull();
  });

  it('xin quyền thông báo từ banner', async () => {
    await configure('default');
    const el = await render();
    await waitForText(el, 'Chưa bật thông báo');
    const button = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Bật thông báo'));
    expect(button).toBeDefined();
    button?.click();
    expect(permissionRequest).toHaveBeenCalled();
  });

  it('báo lỗi đặt nhắc và cho thử lại', async () => {
    await configure();
    const repo = TestBed.inject(EventRepository);
    const ev = await repo.create(event());
    await db.notificationSchedules.add({
      id: 'fail',
      eventId: ev.id,
      occurrenceKey: `${ev.id}:single`,
      reminderId: 'r1',
      scheduledAt: NOW,
      status: 'failed',
      updatedAt: NOW,
    });

    const el = await render();
    await waitForText(el, 'Không đặt được 1 lời nhắc');
    expect(el.textContent).toContain('Chưa có nhắc');

    const retry = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Thử lại'));
    retry?.click();
    await vi.waitFor(() => expect(reconcile).toHaveBeenCalled());
  });
});
