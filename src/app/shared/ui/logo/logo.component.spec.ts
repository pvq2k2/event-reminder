import { TestBed } from '@angular/core/testing';

import { AppLogoComponent } from './logo.component';

describe('AppLogoComponent', () => {
  it('render svg với kích thước theo input', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(AppLogoComponent);
    fixture.componentRef.setInput('size', 48);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('width')).toBe('48');
    expect(svg.getAttribute('height')).toBe('48');
    expect(svg.querySelectorAll('rect, circle').length).toBeGreaterThan(0);
  });

  it('chỉ dùng token theme, không có màu cứng', () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(AppLogoComponent);
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML as string;
    expect(html).toContain('var(--primary)');
    expect(html).toContain('var(--background)');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});
