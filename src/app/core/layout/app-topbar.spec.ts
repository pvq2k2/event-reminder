import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type Routes } from '@angular/router';
import { SearchService } from '@core/data/search.service';
import { ThemeService } from '@core/theme/theme.service';
import { describe, expect, it, vi } from 'vitest';

import { AppTopbar } from './app-topbar';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class BlankPage {}

const routes: Routes = [
  { path: 'today', component: BlankPage },
  { path: 'calendar', component: BlankPage },
  { path: 'contacts', component: BlankPage },
  { path: 'settings', component: BlankPage },
  { path: 'events/:id', component: BlankPage },
];

describe('AppTopbar', () => {
  async function setup(url = '/today') {
    await TestBed.configureTestingModule({
      imports: [AppTopbar],
      providers: [
        provideRouter(routes),
        { provide: SearchService, useValue: { search: vi.fn().mockResolvedValue({ events: [], contacts: [] }) } },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    const fixture = TestBed.createComponent(AppTopbar);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, router, theme: TestBed.inject(ThemeService) };
  }

  it('hiển thị breadcrumb theo route và không có khối người dùng', async () => {
    const { fixture, router } = await setup();

    expect(fixture.nativeElement.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Hôm nay');
    expect(fixture.nativeElement.querySelector('z-avatar, img')).toBeNull();

    await router.navigateByUrl('/calendar');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Lịch');
  });

  it('đổi chế độ sáng/tối từ nút theme', async () => {
    const { fixture, theme } = await setup();
    theme.mode.set('light');
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector(
      'button[aria-label="Chuyển sang chế độ tối"]',
    ) as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(theme.isDark()).toBe(true);
  });

  it('giữ ô tìm kiếm, thông báo và theme trên header', async () => {
    const { fixture } = await setup();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Tìm sự kiện, người thân...');
    expect(fixture.nativeElement.querySelector('a[aria-label="Cài đặt thông báo"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-pressed]')).not.toBeNull();
  });

  it('mở palette tìm kiếm qua z-dialog khi bấm nút header', async () => {
    const { fixture } = await setup();
    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Tìm kiếm sự kiện, người thân"]',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.querySelector('z-dialog-panel')).not.toBeNull();
    fixture.destroy();
  });
});
