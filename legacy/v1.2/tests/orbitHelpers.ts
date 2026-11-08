import { expect, type Page } from '@playwright/test';

export function batchCount(page: Page, total: number) { return page.viewportSize()!.width < 1024 ? Math.min(8, total) : total; }

export async function readAllBatches(page: Page) {
  const names: string[] = [];
  while (true) {
    names.push(...await page.locator('.bubble-name').allTextContents());
    const next = page.getByRole('button', { name: '下一批', exact: true });
    if (!await next.count() || !await next.isEnabled()) break;
    await next.click();
  }
  const previous = page.getByRole('button', { name: '上一批', exact: true });
  while (await previous.count() && await previous.isEnabled()) await previous.click();
  return names;
}

export async function expectNoOverlap(page: Page) {
  const rects = await page.locator('.member-bubble').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, radius: r.width / 2 }; }));
  rects.forEach((a, i) => rects.slice(i + 1).forEach(b => expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.radius + b.radius - 1)));
}
