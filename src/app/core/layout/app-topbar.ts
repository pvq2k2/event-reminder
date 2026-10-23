import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { ThemeService } from '@core/theme/theme.service';
import { ZardButtonComponent } from '@shared/components/button';
import { AppIconComponent } from '@shared/ui';
import { filter, map } from 'rxjs';

import { SearchDialog } from './search-dialog';

const SECTIONS = [
  { prefix: '/today', label: 'Hôm nay' },
  { prefix: '/calendar', label: 'Lịch' },
  { prefix: '/contacts', label: 'Danh bạ' },
  { prefix: '/settings', label: 'Cài đặt' },
  { prefix: '/events', label: 'Lịch' },
] as const;

@Component({
  selector: 'app-topbar',
  imports: [AppIconComponent, RouterLink, SearchDialog, ZardButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'handleSearchShortcut($event)' },
  template: `
    <header class="flex h-15 shrink-0 items-center gap-3 border-b border-border px-6">
      <nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-3 text-sm">
        <a routerLink="/today" class="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
          Event Reminder
        </a>
        <span aria-hidden="true" class="text-muted-foreground">/</span>
        <span aria-current="page" class="truncate font-semibold">{{ section() }}</span>
      </nav>

      <div class="min-w-4 flex-1"></div>

      <button
        type="button"
        class="flex h-9 w-70 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Tìm kiếm sự kiện, người thân"
        (click)="openSearch()"
      >
        <app-icon name="search" [size]="16" />
        <span class="min-w-0 flex-1 truncate text-left">Tìm sự kiện, người thân...</span>
        <kbd class="rounded-sm bg-muted px-1.5 py-0.5 text-[0.6875rem] font-normal">{{ shortcut }}</kbd>
      </button>

      <a
        z-button
        zType="outline"
        zSize="icon-lg"
        routerLink="/settings"
        fragment="notifications"
        aria-label="Cài đặt thông báo"
        title="Cài đặt thông báo"
      >
        <app-icon name="bell" [size]="17" />
      </a>

      <button
        z-button
        zType="outline"
        zSize="icon-lg"
        type="button"
        [attr.aria-label]="theme.isDark() ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'"
        [attr.title]="theme.isDark() ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'"
        [attr.aria-pressed]="theme.isDark()"
        (click)="toggleTheme()"
      >
        <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" [size]="17" />
      </button>
    </header>

    @defer (when searchMounted(); prefetch on idle) {
      <app-search-dialog [open]="searchOpen()" (openChange)="searchOpen.set($event)" />
    }
  `,
})
export class AppTopbar {
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly searchOpen = signal(false);
  protected readonly searchMounted = signal(false);
  protected readonly shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly section = computed(
    () => SECTIONS.find((item) => this.url().startsWith(item.prefix))?.label ?? 'Lịch',
  );

  protected openSearch(): void {
    this.searchMounted.set(true);
    this.searchOpen.set(true);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  protected toggleTheme(): void {
    this.theme.mode.set(this.theme.isDark() ? 'light' : 'dark');
  }

  protected handleSearchShortcut(event: KeyboardEvent): void {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
    event.preventDefault();
    if (this.searchOpen()) {
      this.closeSearch();
    } else {
      this.openSearch();
    }
  }
}
