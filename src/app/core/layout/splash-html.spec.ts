import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

const SELECTORS = [
  ':root',
  '.dark',
  'html.theme-light26',
  'html.theme-light26.dark',
  'html.theme-light27',
  'html.theme-light27.dark',
] as const;
const VARS = ['background', 'foreground', 'muted-foreground', 'primary', 'primary-foreground', 'event-birthday'];

/** Đọc các token màu hex của một block selector (bỏ qua block lồng nhau/không khớp). */
function block(source: string, selector: string): Record<string, string> {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    if (m[1].trim().split(/\s+/).pop() === selector) {
      return Object.fromEntries([...m[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((x) => [x[1], x[2]]));
    }
  }
  return {};
}

describe('splash tĩnh (index.html)', () => {
  it('có markup splash và script áp theme trước khi vẽ', () => {
    expect(html).toContain('id="er-splash"');
    expect(html).toContain("getItem('er.theme')");
    expect(html).toContain("getItem('er.mode')");
  });

  it.each(SELECTORS)('token splash khớp styles.css ở %s', (selector) => {
    const fromHtml = block(html, selector);
    const fromCss = block(css, selector);
    for (const v of VARS) {
      expect(fromHtml[v], `--${v} ở ${selector}`).toBe(fromCss[v]);
    }
  });
});
