import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Khung màn tạo sự kiện 4 bước (Phase 2/4/5): Cơ bản → Thời gian → Lặp lại → Nhắc nhở. Mobile: Sheet toàn màn hình; Desktop: Dialog. */
@Component({
  selector: 'app-event-create-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-xl p-4 md:p-6">
      <h1 class="text-2xl font-bold tracking-tight">Tạo sự kiện</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        TODO(P2): form 4 bước (Reactive Forms + validateEventDraft), thêm bằng
        <code>zard-cli add form input select tabs sheet dialog</code>.
      </p>
      <a routerLink="/today" class="mt-4 inline-block text-sm font-medium text-primary">← Quay lại</a>
    </div>
  `,
})
export class EventCreatePage {}
