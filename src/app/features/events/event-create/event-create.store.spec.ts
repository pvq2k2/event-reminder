import { TestBed } from '@angular/core/testing';
import { Clock } from '@core/data/clock';
import { APP_DB, AppDb } from '@core/data/db';
import { vnLocalToEpochMs } from '@core/domain/date';
import { beforeEach, describe, expect, it } from 'vitest';

import { EventCreateStore } from './event-create.store';

const clock = {
  now: () => vnLocalToEpochMs('2026-10-20', '09:00'),
  todayIso: () => '2026-10-20',
  nowTime: () => '09:00',
};

let db: AppDb;
let store: EventCreateStore;

beforeEach(() => {
  db = new AppDb(`event-create-${crypto.randomUUID()}`);
  TestBed.configureTestingModule({
    providers: [EventCreateStore, { provide: APP_DB, useValue: db }, { provide: Clock, useValue: clock }],
  });
  store = TestBed.inject(EventCreateStore);
});

describe('EventCreateStore validation', () => {
  it('chặn tiêu đề rỗng hoặc quá dài ở bước 1', () => {
    expect(store.validateStep(1)).toBe(false);
    expect(store.titleError()).toBe('Tiêu đề không được để trống');

    store.form.controls.title.setValue('   ');
    expect(store.validateStep(1)).toBe(false);
    expect(store.titleError()).toBe('Tiêu đề không được để trống');

    store.form.controls.title.setValue('x'.repeat(201));
    expect(store.validateStep(1)).toBe(false);
    expect(store.titleError()).toBe('Tiêu đề tối đa 200 ký tự');

    store.form.controls.title.setValue('Họp');
    expect(store.validateStep(1)).toBe(true);
  });

  it('chặn giờ kết thúc trước giờ bắt đầu ở bước 2', () => {
    store.form.controls.title.setValue('Họp');
    store.form.controls.isAllDay.setValue(false);
    store.form.controls.endTime.setValue('18:00');

    expect(store.endTimeError()).toBe('Giờ kết thúc phải sau giờ bắt đầu');
    expect(store.validateStep(2)).toBe(false);
    expect(store.form.controls.endTime.touched).toBe(true);

    store.form.controls.endTime.setValue('20:00');
    expect(store.validateStep(2)).toBe(true);

    store.form.controls.endTime.setValue('');
    expect(store.endTimeError()).toBeNull();
    expect(store.validateStep(2)).toBe(true);
  });

  it('bỏ qua giờ kết thúc khi sự kiện cả ngày', () => {
    store.form.controls.isAllDay.setValue(true);
    store.form.controls.endTime.setValue('18:00');

    expect(store.endTimeError()).toBeNull();
    expect(store.validateStep(2)).toBe(true);
  });

  it('chặn lặp tuần không chọn thứ ở bước 3', () => {
    store.form.controls.repeatKind.setValue('daily');
    store.form.controls.subKind.setValue('weekly');
    store.selectedWeekdays.set([]);

    expect(store.validateStep(3)).toBe(false);
    expect(store.ruleError()).toBe('Chọn ít nhất một thứ trong tuần');
  });

  it('chặn ngày kết thúc lặp trước ngày bắt đầu ở bước 3', () => {
    store.form.controls.repeatKind.setValue('daily');
    store.form.controls.subKind.setValue('weekly');
    store.selectedWeekdays.set([5]);
    store.form.controls.endType.setValue('until');
    store.form.controls.endConditionDate.setValue('2026-10-19');

    expect(store.validateStep(3)).toBe(false);
    expect(store.ruleError()).toBe('Ngày kết thúc lặp phải sau hoặc bằng ngày bắt đầu');

    store.form.controls.endConditionDate.setValue('2026-10-20');
    expect(store.validateStep(3)).toBe(true);
  });
});
