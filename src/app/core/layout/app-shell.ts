import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppIcon, type IconName } from '@shared/ui/icon';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

/**
 * Khung responsive (mobile-first). Cùng một danh sách điều hướng, ba cách hiển thị:
 *  - < md: thanh tab dưới đáy   - md: rail icon   - lg+: sidebar đầy đủ.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh bg-background text-foreground">
      <aside
        class="sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground md:flex md:w-16 lg:w-64"
      >
        <div class="mb-4 flex items-center gap-2 px-2 py-1">
          <span class="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
            ><app-icon name="moon" [size]="18"
          /></span>
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

      <main class="min-w-0 flex-1 pb-24 md:pb-0"><router-outlet /></main>

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
    </div>
  `,
})
export class AppShell {
  protected readonly nav: NavItem[] = [
    { path: '/today', label: 'Hôm nay', icon: 'today' },
    { path: '/calendar', label: 'Lịch', icon: 'calendar' },
    { path: '/contacts', label: 'Danh bạ', icon: 'contacts' },
    { path: '/settings', label: 'Cài đặt', icon: 'settings' },
  ];
}
