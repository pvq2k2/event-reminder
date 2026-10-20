import { type ISODate, diffDays, parseIso, weekday } from '@core/domain/date';

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WEEKDAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const weekdayVi = (iso: ISODate): string => WEEKDAYS[weekday(iso)];
export const weekdayShortVi = (iso: ISODate): string => WEEKDAYS_SHORT[weekday(iso)];
export const formatVi = (iso: ISODate): string => {
  const [y, m, d] = parseIso(iso);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};
export const formatViShort = (iso: ISODate): string => formatVi(iso).slice(0, 5);

/** Lời chào theo giờ Việt Nam (0–23). */
export function greetingVi(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/** Khoảng thời gian còn lại, dạng ngắn `2g 15p` / `3n 2g`. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Bây giờ';
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}n ${hours}g` : `${days}n`;
  if (hours > 0) return minutes > 0 ? `${hours}g ${minutes}p` : `${hours}g`;
  return `${Math.max(1, minutes)}p`;
}

/** Nhãn tương đối so với hôm nay, dùng cho danh sách sắp tới. */
export function formatRelativeDay(iso: ISODate, today: ISODate): string {
  const diff = diffDays(iso, today);
  if (diff <= 0) return 'Hôm nay';
  if (diff === 1) return 'Ngày mai';
  return `${diff} ngày`;
}
