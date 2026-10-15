import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Khung màn chi tiết sự kiện. `id` nhận từ route nhờ withComponentInputBinding(). */
@Component({
  selector: 'app-event-detail-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Host phải block + cao full để khung header-scroll bên trong tính đúng.
  host: { class: 'block h-full min-h-0' },
  template: `
    <div class="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col">
      <div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
        <h1 class="text-2xl font-bold tracking-tight">Chi tiết sự kiện</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          ID: {{ id() }}. TODO(P2): hiển thị, sửa (chọn phạm vi chuỗi lặp), xóa.
        </p>
        <a routerLink="/today" class="mt-4 inline-block text-sm font-medium text-primary">← Quay lại</a>
      </div>
    </div>
  `,
})
export class EventDetailPage {
  readonly id = input.required<string>();
}
