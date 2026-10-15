import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppShell } from './app-shell';
import { routes } from '../../app.routes';

describe('AppShell', () => {
  it('mọi route page đều nằm trong shell (có nav)', () => {
    const shell = routes.find((r) => r.path === '');
    const children = (shell?.children ?? []).map((c) => c.path);
    for (const p of ['today', 'calendar', 'contacts', 'settings', 'events/new', 'events/:id']) {
      expect(children).toContain(p);
    }
  });

  it('giữ thanh nav ở trang chính, ẩn ở trang tạo sự kiện (sheet toàn màn hình)', async () => {
    // Template có @defer nên phải biên dịch bất đồng bộ trước.
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter(routes)],
    }).compileComponents();
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AppShell);

    await router.navigateByUrl('/today');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).not.toBeNull();

    await router.navigateByUrl('/events/new');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });
});
