import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { type SearchResults, SearchService } from '@core/data/search.service';
import type { AppEvent } from '@core/domain/models';
import { ZardDialogImports } from '@shared/components/dialog/dialog.imports';
import { AppIconComponent, type IconName } from '@shared/ui';
import { formatVi } from '@shared/utils';
import { debounceTime, from, switchMap } from 'rxjs';

interface SearchItem {
  key: string;
  title: string;
  meta: string;
  link: string;
  icon: IconName;
}

const EMPTY_RESULTS: SearchResults = { events: [], contacts: [] };
const DIALOG_WIDTH = 'min(36rem, calc(100vw - 2rem))';

@Component({
  selector: 'app-search-dialog',
  imports: [AppIconComponent, RouterLink, ...ZardDialogImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <z-dialog
      [zVisible]="open()"
      (zVisibleChange)="open.set($event)"
      [zClosable]="false"
      [zWidth]="dialogWidth"
      [class]="'sm:max-w-xl'"
      (zAfterOpen)="onOpen()"
    >
      <z-dialog-title [class]="'sr-only'">Tìm kiếm</z-dialog-title>

      <label for="global-search" class="sr-only">Tìm sự kiện hoặc người thân</label>
      <div class="flex items-center gap-2 border-b border-border pb-3">
        <app-icon name="search" [size]="18" class="text-muted-foreground" />
        <input
          #searchInput
          id="global-search"
          type="search"
          class="h-10 min-w-0 flex-1 bg-transparent px-0 text-base outline-none placeholder:text-muted-foreground"
          placeholder="Tìm sự kiện, người thân..."
          autocomplete="off"
          [value]="query()"
          (input)="updateQuery($event)"
          (keydown.enter)="openFirst($event)"
        />
        <kbd class="rounded-sm bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground">Esc</kbd>
      </div>

      <div class="scrollbar-thin max-h-80 overflow-y-auto">
        @for (item of items(); track item.key) {
          <a
            [routerLink]="item.link"
            (click)="open.set(false)"
            class="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <span class="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <app-icon [name]="item.icon" [size]="17" />
            </span>
            <span class="min-w-0 flex-1">
              <b class="block truncate text-sm font-medium">{{ item.title }}</b>
              <span class="block truncate text-xs text-muted-foreground">{{ item.meta }}</span>
            </span>
            <app-icon name="chevronRight" [size]="16" class="text-muted-foreground" />
          </a>
        } @empty {
          <p class="px-3 py-8 text-center text-sm text-muted-foreground">
            @if (query().trim()) {
              Không tìm thấy sự kiện hoặc người thân phù hợp.
            } @else {
              Nhập tên sự kiện hoặc người thân để tìm.
            }
          </p>
        }
      </div>
    </z-dialog>
  `,
})
export class SearchDialog {
  private readonly router = inject(Router);
  private readonly search = inject(SearchService);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly open = model(false);

  protected readonly query = signal('');
  protected readonly dialogWidth = DIALOG_WIDTH;

  private readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(120),
      switchMap((query) => from(this.search.search(query))),
    ),
    { initialValue: EMPTY_RESULTS },
  );

  protected readonly items = computed<SearchItem[]>(() => {
    const results = this.results();
    return [
      ...results.events.map((event) => ({
        key: `event-${event.id}`,
        title: event.title,
        meta: this.eventMeta(event),
        link: `/events/${event.id}`,
        icon: 'calendar' as const,
      })),
      ...results.contacts.map((contact) => ({
        key: `contact-${contact.id}`,
        title: contact.displayName,
        meta: contact.phone ?? 'Liên hệ',
        link: '/contacts',
        icon: 'contacts' as const,
      })),
    ];
  });

  protected onOpen(): void {
    this.query.set('');
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  protected updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected openFirst(event: Event): void {
    event.preventDefault();
    const first = this.items().at(0);
    if (!first) return;
    this.open.set(false);
    void this.router.navigateByUrl(first.link);
  }

  private eventMeta(event: AppEvent): string {
    const time = event.isAllDay ? 'Cả ngày' : event.startTime;
    return time ? `${formatVi(event.startDate)} · ${time}` : formatVi(event.startDate);
  }
}
