import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { ContactRepository, type GroupNode } from '@core/data/contact.repository';

/** Khung màn Danh bạ (Phase 6). Hiện đã đọc cây Bên nội/Bên ngoại → Gia đình → Thành viên từ IndexedDB. */
@Component({
  selector: 'app-contacts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:p-6">
      <h1 class="text-2xl font-bold tracking-tight">Danh bạ</h1>
      @for (g of tree() ?? []; track g.id) {
        <section class="rounded-xl border border-border bg-card p-4">
          <h2 class="font-semibold">
            {{ g.name }}
            <span class="text-sm font-normal text-muted-foreground">· {{ g.families.length }} gia đình</span>
          </h2>
          @for (f of g.families; track f.id) {
            <div class="mt-3 rounded-lg bg-muted p-3">
              <b class="text-sm">{{ f.name }}</b>
              <ul class="mt-1 text-sm text-muted-foreground">
                @for (m of f.members; track m.id) {
                  <li>{{ m.contact.displayName }} · {{ m.relationship }}</li>
                }
              </ul>
            </div>
          } @empty {
            <p class="mt-2 text-sm text-muted-foreground">Chưa có gia đình nào.</p>
          }
        </section>
      }
      <p class="text-xs text-muted-foreground">
        TODO(P6): CRUD gia đình/thành viên, tìm kiếm, chi tiết liên hệ, xác nhận xóa theo quy tắc trong docs/SOLUTION.md
        §4.3.
      </p>
    </div>
  `,
})
export class ContactsPage {
  private readonly repo = inject(ContactRepository);
  protected readonly tree = toSignal<GroupNode[] | null>(from(liveQuery(() => this.repo.tree())), {
    initialValue: null,
  });
}
