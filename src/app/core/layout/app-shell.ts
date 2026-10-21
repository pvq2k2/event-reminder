import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/theme/theme.service';
import { ZardSonnerComponent } from '@shared/components/sonner';
import { AppIconComponent, AppLogoComponent, type IconName } from '@shared/ui';
import { filter, map } from 'rxjs';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

/**
 * Khung responsive (mobile-first). Khóa theo viewport (`h-dvh`): main cố định,
 * từng page tự chia header cố định + vùng scroll + footer.
 *  - < md: thanh tab dưới đáy (ẩn ở trang tạo/sửa sự kiện)   - md: rail icon   - lg+: sidebar đầy đủ.
 */
@Component({
  selector: 'app-shell',
  imports: [AppIconComponent, AppLogoComponent, RouterLink, RouterLinkActive, RouterOutlet, ZardSonnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside
        class="hidden scrollbar-thin h-dvh shrink-0 flex-col gap-1 overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground md:flex md:w-16 lg:w-64"
      >
        <div class="mb-4 flex items-center gap-2 px-2 py-1">
          <app-logo [size]="32" />
          <b class="hidden text-sm lg:block">Event Reminder</b>
        </div>
        @for (item of nav; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground [&_app-icon]:text-sidebar-primary"
            class="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent/70"
            [attr.aria-label]="item.label"
          >
            <app-icon [name]="item.icon" />
            <span class="hidden lg:inline">{{ item.label }}</span>
          </a>
        }
      </aside>

      <main
        class="min-h-0 min-w-0 flex-1 overflow-hidden md:pb-0"
        [class.pb-[calc(4rem+env(safe-area-inset-bottom))]]="!hideMobileNav()"
      >
        <router-outlet />
      </main>
      @defer (on idle) {
        <z-sonner
          [theme]="theme.mode()"
          position="bottom-center"
          [richColors]="true"
          [closeButton]="true"
          [duration]="5000"
        />
      }

      @if (!hideMobileNav()) {
        <nav
          class="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Điều hướng chính"
        >
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-primary font-semibold"
              class="flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] text-muted-foreground"
            >
              <app-icon [name]="item.icon" />{{ item.label }}
            </a>
          }
        </nav>
      }
    </div>
  `,
})
export class AppShell {
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);
  /**
   * Trang tạo/sửa sự kiện trên mobile là sheet toàn màn hình (design Step1–Step4):
   * ẩn tab bar dưới, sidebar desktop giữ nguyên (design WebCreateDialog).
   */
  protected readonly hideMobileNav = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/events')),
    ),
    { initialValue: this.router.url.startsWith('/events') },
  );
  protected readonly nav: NavItem[] = [
    { path: '/today', label: 'Hôm nay', icon: 'today' },
    { path: '/calendar', label: 'Lịch', icon: 'calendar' },
    { path: '/contacts', label: 'Danh bạ', icon: 'contacts' },
    { path: '/settings', label: 'Cài đặt', icon: 'settings' },
  ];
}
