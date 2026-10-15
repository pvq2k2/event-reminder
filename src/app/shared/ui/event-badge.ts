import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EventCategory } from '@core/domain/models';
import { cn } from '../utils/cn';

const STYLES: Record<EventCategory, { label: string; cls: string }> = {
  work: { label: 'Công việc', cls: 'bg-event-work/15 text-event-work-ink' },
  birthday: { label: 'Sinh nhật', cls: 'bg-event-birthday/20 text-event-birthday-ink' },
  memorial: { label: 'Giỗ · Âm lịch', cls: 'bg-event-memorial/20 text-event-memorial-ink' },
  other: { label: 'Khác', cls: 'bg-muted text-muted-foreground' },
};

/** Luôn có nhãn chữ, không dựa vào màu để phân biệt (WCAG 1.4.1). */
@Component({
  selector: 'app-event-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'cls()' },
  template: '{{ label() }}',
})
export class EventBadge {
  readonly category = input.required<EventCategory>();
  protected readonly label = computed(() => STYLES[this.category()].label);
  protected readonly cls = computed(() =>
    cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STYLES[this.category()].cls),
  );
}
