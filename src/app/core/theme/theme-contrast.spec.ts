import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Đọc token thật từ src/styles.css và kiểm tra WCAG AA (4.5:1) cho 6 biến thể: 3 bộ màu × sáng/tối. */
const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    if (m[1].trim().split(/\s+/).pop() === selector || m[1].trim() === selector) {
      return Object.fromEntries([...m[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((x) => [x[1], x[2]]));
    }
  }
  return {};
}

const rgb = (h: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a: string, b: string, p: number) =>
  '#' +
  rgb(a)
    .map((v, i) =>
      Math.round(v * p + rgb(b)[i] * (1 - p))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

const variants: [string, Record<string, string>][] = [];
for (const theme of ['', 'theme-light26', 'theme-light27']) {
  const light = { ...block(':root'), ...(theme ? block(`html.${theme}`) : {}) };
  const dark = {
    ...block(':root'),
    ...block('.dark'),
    ...(theme ? { ...block(`html.${theme}`), ...block(`html.${theme}.dark`) } : {}),
  };
  variants.push([`${theme || 'default'} · sáng`, light], [`${theme || 'default'} · tối`, dark]);
}

describe.each(variants)('tương phản %s', (_name, t) => {
  it('có đủ token', () => expect(Object.keys(t).length).toBeGreaterThan(30));
  const cases: [string, string, string][] = [
    ['chữ chính / nền', t['foreground'], t['background']],
    ['chữ phụ / nền', t['muted-foreground'], t['background']],
    ['chữ phụ / thẻ', t['muted-foreground'], t['card']],
    ['chữ phụ / muted', t['muted-foreground'], t['muted']],
    ['chữ trên nút primary', t['primary-foreground'], t['primary']],
    ['primary làm chữ / nền', t['primary'], t['background']],
    ['chữ trên nút xóa', t['destructive-foreground'], t['destructive']],
    ...(['work', 'birthday', 'memorial', 'done'] as const).map((c): [string, string, string] => [
      `badge ${c}`,
      t[`event-${c}-ink`],
      mix(t[`event-${c}`], t['card'], 0.2),
    ]),
  ];
  it.each(cases)('%s ≥ 4.5:1', (_label, fg, bg) => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
});
