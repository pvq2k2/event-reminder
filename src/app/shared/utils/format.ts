import { type ISODate, parseIso, weekday } from '@core/domain/date';

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export const weekdayVi = (iso: ISODate): string => WEEKDAYS[weekday(iso)];
export const formatVi = (iso: ISODate): string => {
  const [y, m, d] = parseIso(iso);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};
export const formatViShort = (iso: ISODate): string => formatVi(iso).slice(0, 5);
