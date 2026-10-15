import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppIcon, ICON_NAMES } from './icon';

@Component({
  imports: [AppIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (n of names; track n) {
      <app-icon [name]="n" />
    }
  `,
})
class Host {
  readonly names = ICON_NAMES;
}

describe('AppIcon', () => {
  it('hiển thị đủ svg cho mọi icon (hồi quy lỗi sanitizer lọc innerHTML)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const svgs = fixture.nativeElement.querySelectorAll('svg');
    expect(svgs.length).toBe(ICON_NAMES.length);
    for (const svg of svgs) {
      expect(svg.querySelector('circle, path, rect')).not.toBeNull();
    }
  });

  it('áp dụng đúng kích thước được truyền vào', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(AppIcon);
    fixture.componentRef.setInput('name', 'moon');
    fixture.componentRef.setInput('size', 16);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.getAttribute('height')).toBe('16');
  });
});
