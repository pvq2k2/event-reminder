import type { EventCategory } from '@core/domain/models';

export interface EventCategoryStyle {
  label: string;
  badge: string;
  dot: string;
  soft: string;
}

/**
 * Một nguồn cho nhãn/màu loại sự kiện: badge, chấm lịch và nền timeline dùng chung.
 * Chỉ dùng token theme, không mã màu cứng.
 */
export const EVENT_CATEGORY_STYLES: Record<EventCategory, EventCategoryStyle> = {
  work: {
    label: 'Công việc',
    badge: 'bg-event-work/15 text-event-work-ink',
    dot: 'bg-event-work',
    soft: 'bg-event-work/10',
  },
  birthday: {
    label: 'Sinh nhật',
    badge: 'bg-event-birthday/20 text-event-birthday-ink',
    dot: 'bg-event-birthday',
    soft: 'bg-event-birthday/10',
  },
  memorial: {
    label: 'Giỗ · Âm lịch',
    badge: 'bg-event-memorial/20 text-event-memorial-ink',
    dot: 'bg-event-memorial',
    soft: 'bg-event-memorial/10',
  },
  other: {
    label: 'Khác',
    badge: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
    soft: 'bg-muted/60',
  },
};

export const eventCategoryStyle = (category: EventCategory): EventCategoryStyle => EVENT_CATEGORY_STYLES[category];
