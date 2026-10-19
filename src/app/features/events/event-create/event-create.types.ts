/** Các mốc nhắc nhanh (phút trước sự kiện). 0 = đúng giờ. */
export const QUICK_OFFSETS = [1440, 60, 30, 0];

export type RepeatKind = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly-solar' | 'yearly-lunar';
