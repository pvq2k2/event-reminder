import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Clock } from '@core/data/clock';
import { APP_DB, AppDb } from '@core/data/db';
import { EventService } from '@core/data/event.service';
import { SettingsRepository } from '@core/data/settings.repository';
import { vnLocalToEpochMs } from '@core/domain/date';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventCreatePage } from './event-create.page';
import { EventCreateStore } from './event-create.store';

const clock = {
  now: () => vnLocalToEpochMs('2026-10-20', '09:00'),
  todayIso: () => '2026-10-20',
  nowTime: () => '09:00',
};

const events = { create: vi.fn() };
const settings = { get: vi.fn(), update: vi.fn() };

let db: AppDb;
let fixture: ComponentFixture<EventCreatePage>;
let root: HTMLElement;
let store: EventCreateStore;

beforeEach(async () => {
  db = new AppDb(`event-create-page-${crypto.randomUUID()}`);
  vi.clearAllMocks();
  await TestBed.configureTestingModule({
    imports: [EventCreatePage],
    providers: [
      provideRouter([]),
      { provide: APP_DB, useValue: db },
      { provide: Clock, useValue: clock },
      { provide: EventService, useValue: events },
      { provide: SettingsRepository, useValue: settings },
    ],
  }).compileComponents();
});

function render(): void {
  fixture = TestBed.createComponent(EventCreatePage);
  fixture.detectChanges();
  root = fixture.nativeElement as HTMLElement;
  store = fixture.debugElement.injector.get(EventCreateStore);
}

function text(): string {
  return root.textContent;
}

function continueButton(): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Tiếp tục');
  if (!button) throw new Error('Không tìm thấy nút Tiếp tục');
  return button;
}

function next(): void {
  continueButton().click();
  fixture.detectChanges();
}

function clickButton(label: string): void {
  const button = Array.from(root.querySelectorAll('button')).find((b) => b.textContent.includes(label));
  if (!button) throw new Error(`Không tìm thấy nút ${label}`);
  button.click();
  fixture.detectChanges();
}

function goToStep2(): void {
  store.form.controls.title.setValue('Họp');
  fixture.detectChanges();
  next();
}

describe('EventCreatePage validation', () => {
  it('chặn bước 1 khi tiêu đề quá dài', () => {
    render();
    store.form.controls.title.setValue('x'.repeat(201));
    fixture.detectChanges();

    next();

    expect(text()).toContain('Sự kiện gì vậy?');
    expect(text()).toContain('Tiêu đề tối đa 200 ký tự');
  });

  it('liên kết label với control và đánh dấu invalid khi submit', () => {
    render();
    const input = root.querySelector('input#event-title') as HTMLInputElement;

    expect(root.querySelector('label[for="event-title"]')?.textContent).toContain('Tiêu đề');
    expect(input).not.toBeNull();

    next();

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.closest('[z-field]')?.getAttribute('data-invalid')).toBe('true');
  });

  it('chặn bước 2 và hiện lỗi khi giờ kết thúc trước giờ bắt đầu', () => {
    render();
    goToStep2();
    expect(text()).toContain('Khi nào diễn ra?');

    const allDaySwitch = root.querySelector('button[role="switch"]') as HTMLButtonElement;
    allDaySwitch.click();
    fixture.detectChanges();

    const endTime = root.querySelectorAll('input[type="time"]')[1] as HTMLInputElement;
    endTime.value = '18:00';
    endTime.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(text()).toContain('Giờ kết thúc phải sau giờ bắt đầu');

    next();

    expect(text()).toContain('Khi nào diễn ra?');
    expect(text()).toContain('Giờ kết thúc phải sau giờ bắt đầu');
  });

  it('chặn bước 3 khi lặp tuần không chọn thứ', () => {
    render();
    goToStep2();
    next();
    expect(text()).toContain('Có lặp lại không?');

    clickButton('Hằng ngày / tuần / tháng');
    clickButton('Hằng tuần');
    clickButton('T6');

    expect(text()).toContain('Chọn ít nhất một thứ trong tuần');

    next();

    expect(text()).toContain('Có lặp lại không?');
    expect(text()).toContain('Chọn ít nhất một thứ trong tuần');
  });

  it('đi qua các bước khi dữ liệu hợp lệ', () => {
    render();
    goToStep2();
    store.form.controls.isAllDay.setValue(false);
    store.form.controls.startTime.setValue('19:00');
    store.form.controls.endTime.setValue('20:00');
    fixture.detectChanges();

    next();
    expect(text()).toContain('Có lặp lại không?');

    next();
    expect(text()).toContain('Nhắc bạn lúc nào?');
  });
});
