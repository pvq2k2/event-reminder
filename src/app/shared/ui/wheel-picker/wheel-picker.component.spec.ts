import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WheelPickerComponent } from './wheel-picker.component';

@Component({
  imports: [WheelPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-wheel-picker
      label="Ngày"
      [options]="[
        { value: '28', label: '28' },
        { value: '29', label: '29' },
        { value: '30', label: '30' },
      ]"
      [(value)]="picked"
    />
  `,
})
class Host {
  readonly picked = signal('29');
}

@Component({
  imports: [WheelPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <app-wheel-picker bare label="Ngày" [options]="[{ value: '29', label: '29' }]" value="29" /> `,
})
class BareHost {
  readonly picked = signal('29');
}

describe('WheelPickerComponent', () => {
  it('hiển thị đủ lựa chọn, mục đang chọn có aria-selected', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
    expect(fixture.nativeElement.querySelector('[aria-selected="true"]')?.textContent?.trim()).toBe('29');
  });

  it('bấm mục khác thì đổi giá trị', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('[role="option"]') as NodeListOf<HTMLElement>;
    options[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.picked()).toBe('30');
    expect(fixture.nativeElement.querySelector('[aria-selected="true"]')?.textContent?.trim()).toBe('30');
  });

  it('phím ArrowDown chuyển sang mục kế tiếp', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const box = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.picked()).toBe('30');
  });

  it('mỗi nhịp lăn chuột chỉ bước đúng 1 ô, nhịp dồn thì bỏ qua', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const box = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    const roll = (deltaY: number) =>
      box.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
    roll(120);
    expect(fixture.componentInstance.picked()).toBe('30');
    roll(120);
    expect(fixture.componentInstance.picked()).toBe('30');
  });

  it('chế độ bare ẩn nhãn và band riêng (card cha vẽ band chung)', () => {
    const fixture = TestBed.createComponent(BareHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('p')).toBeNull();
    expect(el.querySelector('[role="listbox"]')).not.toBeNull();
  });
});
