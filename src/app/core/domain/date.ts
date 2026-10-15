/** Tiện ích ngày thuần (không dùng Date/timezone). Ngày là chuỗi ISO `YYYY-MM-DD`, giờ là `HH:mm`. */
export type ISODate = string;
export type HHmm = string;

export function jdFromYmd(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

export function ymdFromJd(jd: number): [year: number, month: number, day: number] {
  let b: number;
  let c: number;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return [year, month, day];
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function parseIso(iso: ISODate): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`Ngày không hợp lệ: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function formatIso(year: number, month: number, day: number): ISODate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export const toJdn = (iso: ISODate): number => jdFromYmd(...parseIso(iso));
export const fromJdn = (jd: number): ISODate => formatIso(...ymdFromJd(jd));
export const addDays = (iso: ISODate, n: number): ISODate => fromJdn(toJdn(iso) + n);
export const diffDays = (a: ISODate, b: ISODate): number => toJdn(a) - toJdn(b);

/** 0 = Chủ nhật … 6 = Thứ bảy. */
export const weekday = (iso: ISODate): number => (toJdn(iso) + 1) % 7;

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Thứ Hai đầu tuần chứa `iso`. */
export function startOfWeekMonday(iso: ISODate): ISODate {
  return addDays(iso, -((weekday(iso) + 6) % 7));
}

/** Giờ địa phương Việt Nam (UTC+7, không DST) → epoch ms. */
export function vnLocalToEpochMs(date: ISODate, time: HHmm, offsetMinutes = 420): number {
  const [y, mo, d] = parseIso(date);
  const [h, mi] = time.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - offsetMinutes * 60_000;
}

export function epochMsToVnLocal(ms: number, offsetMinutes = 420): { date: ISODate; time: HHmm } {
  const dt = new Date(ms + offsetMinutes * 60_000);
  return {
    date: formatIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()),
    time: `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`,
  };
}
