import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EventCategory } from '@core/domain/models';
import { cn } from '../utils/cn';
import { eventCategoryStyle } from './event-category';

/** Luôn có nhãn chữ, không dựa vào màu để phân biệt (WCAG 1.4.1). */
@Component({
  selector: 'app-event-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'cls()' },
  template: '{{ label() }}',
})
export class EventBadge {
  readonly category = input.required<EventCategory>();
  protected readonly label = computed(() => eventCategoryStyle(this.category()).label);
  protected readonly cls = computed(() =>
    cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      eventCategoryStyle(this.category()).badge,
    ),
  );
}
