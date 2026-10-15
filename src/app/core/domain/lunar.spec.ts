import { describe, expect, it } from 'vitest';
import { addDays } from './date';
import { canChiYear, formatLunar, gregorianToLunar, lunarToGregorian } from './lunar';

const L = (day: number, month: number, year: number, isLeapMonth = false) => ({ day, month, year, isLeapMonth });

describe('gregorianToLunar', () => {
  it.each([
    ['2021-02-12', L(1, 1, 2021)],
    ['2022-02-01', L(1, 1, 2022)],
    ['2023-01-22', L(1, 1, 2023)],
    ['2024-02-10', L(1, 1, 2024)],
    ['2025-01-29', L(1, 1, 2025)],
    ['2026-02-17', L(1, 1, 2026)],
    ['2027-02-06', L(1, 1, 2027)],
    ['2028-01-26', L(1, 1, 2028)],
  ])('mùng 1 Tết: %s', (iso, expected) => expect(gregorianToLunar(iso)).toEqual(expected));

  it('Trung thu 2026 (15/8) và ngày 29/8 khớp mockup', () => {
    expect(gregorianToLunar('2026-09-25')).toEqual(L(15, 8, 2026));
    expect(gregorianToLunar('2026-10-09')).toEqual(L(29, 8, 2026));
  });

  it('năm 2023 nhuận tháng 2', () => {
    expect(gregorianToLunar('2023-02-20')).toEqual(L(1, 2, 2023));
    expect(gregorianToLunar('2023-03-22')).toEqual(L(1, 2, 2023, true));
  });

  it('cuối năm âm thuộc năm âm cũ', () => {
    expect(gregorianToLunar('2026-02-16').year).toBe(2025);
    expect(gregorianToLunar('2026-01-10').year).toBe(2025);
  });
});

describe('lunarToGregorian', () => {
  it('chuyển ngược các mốc đã biết', () => {
    expect(lunarToGregorian(L(1, 1, 2026))).toBe('2026-02-17');
    expect(lunarToGregorian(L(29, 8, 2026))).toBe('2026-10-09');
    expect(lunarToGregorian(L(1, 2, 2023, true))).toBe('2023-03-22');
  });

  it('trả về null khi tháng nhuận không tồn tại', () => {
    expect(lunarToGregorian(L(1, 2, 2026, true))).toBeNull();
    expect(lunarToGregorian(L(1, 3, 2023, true))).toBeNull();
  });

  it('trả về null với ngày/tháng ngoài phạm vi', () => {
    expect(lunarToGregorian(L(0, 1, 2026))).toBeNull();
    expect(lunarToGregorian(L(1, 13, 2026))).toBeNull();
  });

  it('khứ hồi 2020–2032 không lệch ngày nào', () => {
    let d = '2020-01-01';
    while (d < '2033-01-01') {
      const lunar = gregorianToLunar(d);
      expect(lunarToGregorian(lunar), d).toBe(d);
      d = addDays(d, 1);
    }
  });
});

describe('canChiYear / formatLunar', () => {
  it('đặt tên năm', () => {
    expect(canChiYear(2026)).toBe('Bính Ngọ');
    expect(canChiYear(2024)).toBe('Giáp Thìn');
    expect(canChiYear(2025)).toBe('Ất Tỵ');
  });
  it('định dạng hiển thị', () => {
    expect(formatLunar(L(29, 8, 2026), true)).toBe('29/8 Bính Ngọ');
    expect(formatLunar(L(1, 2, 2023, true))).toBe('1/2 nhuận');
  });
});
