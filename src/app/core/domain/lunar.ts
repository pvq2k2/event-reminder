import { type ISODate, formatIso, jdFromYmd, parseIso, ymdFromJd } from './date';

/** Âm lịch Việt Nam (UTC+7), thuật toán thiên văn của Hồ Ngọc Đức. Hàm thuần, không phụ thuộc UI/DB. */
export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeapMonth: boolean;
}

const TZ = 7;
const PI = Math.PI;
const SYNODIC = 29.530588853;
const EPOCH = 2415021.076998695;

function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c1 -= 0.4068 * Math.sin(Mpr * dr) - 0.0161 * Math.sin(dr * 2 * Mpr);
  c1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  c1 += 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c1 -= 0.0074 * Math.sin(dr * (M - Mpr)) - 0.0004 * Math.sin(dr * (2 * F + M));
  c1 -= 0.0004 * Math.sin(dr * (2 * F - M)) + 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c1 += 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + c1 - deltat;
}

function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  dl += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + dl) * dr;
  L -= PI * 2 * Math.floor(L / (PI * 2));
  return L;
}

const sunLongitudeIndex = (dayNumber: number) => Math.floor((sunLongitude(dayNumber - 0.5 - TZ / 24) / PI) * 6);
const newMoonDay = (k: number) => Math.floor(newMoon(k) + 0.5 + TZ / 24);

function lunarMonth11(year: number): number {
  const off = jdFromYmd(year, 12, 31) - 2415021;
  const k = Math.floor(off / SYNODIC);
  let nm = newMoonDay(k);
  if (sunLongitudeIndex(nm) >= 9) nm = newMoonDay(k - 1);
  return nm;
}

function leapMonthOffset(a11: number): number {
  const k = Math.floor((a11 - EPOCH) / SYNODIC + 0.5);
  let i = 1;
  let arc = sunLongitudeIndex(newMoonDay(k + i));
  let last: number;
  do {
    last = arc;
    i++;
    arc = sunLongitudeIndex(newMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

export function gregorianToLunar(date: ISODate): LunarDate {
  const [yy, mm, dd] = parseIso(date);
  const dayNumber = jdFromYmd(yy, mm, dd);
  const k = Math.floor((dayNumber - EPOCH) / SYNODIC);
  let monthStart = newMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = newMoonDay(k);
  let a11 = lunarMonth11(yy);
  let b11 = a11;
  let year: number;
  if (a11 >= monthStart) {
    year = yy;
    a11 = lunarMonth11(yy - 1);
  } else {
    year = yy + 1;
    b11 = lunarMonth11(yy + 1);
  }
  const day = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let isLeapMonth = false;
  let month = diff + 11;
  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11);
    if (diff >= leapDiff) {
      month = diff + 10;
      if (diff === leapDiff) isLeapMonth = true;
    }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) year -= 1;
  return { day, month, year, isLeapMonth };
}

/** Trả về `null` nếu ngày âm không tồn tại (tháng nhuận không có, ngày 30 của tháng thiếu...). */
export function lunarToGregorian(lunar: LunarDate): ISODate | null {
  const { day, month, year, isLeapMonth } = lunar;
  if (day < 1 || day > 30 || month < 1 || month > 12) return null;
  let a11: number;
  let b11: number;
  if (month < 11) {
    a11 = lunarMonth11(year - 1);
    b11 = lunarMonth11(year);
  } else {
    a11 = lunarMonth11(year);
    b11 = lunarMonth11(year + 1);
  }
  const k = Math.floor(0.5 + (a11 - EPOCH) / SYNODIC);
  let off = month - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = leapMonthOffset(a11);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (isLeapMonth && month !== leapMonth) return null;
    if (isLeapMonth || off >= leapOff) off += 1;
  } else if (isLeapMonth) {
    return null;
  }
  const iso = formatIso(...ymdFromJd(newMoonDay(k + off) + day - 1));
  const back = gregorianToLunar(iso);
  const ok = back.day === day && back.month === month && back.year === year && back.isLeapMonth === isLeapMonth;
  return ok ? iso : null;
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

/** Tên năm Can Chi, ví dụ 2026 → "Bính Ngọ". */
export const canChiYear = (lunarYear: number): string => `${CAN[(lunarYear + 6) % 10]} ${CHI[(lunarYear + 8) % 12]}`;

export function formatLunar(l: LunarDate, withYear = false): string {
  const base = `${l.day}/${l.month}${l.isLeapMonth ? ' nhuận' : ''}`;
  return withYear ? `${base} ${canChiYear(l.year)}` : base;
}
