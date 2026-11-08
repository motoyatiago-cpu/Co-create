import { test, expect } from '@playwright/test';

test('首页、五区导航与进入按钮', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const failed: string[] = [];
  page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('最正经的1组');
  await expect(page.locator('.hero-art img')).toHaveJSProperty('naturalWidth', 1100);
  await page.getByRole('link', { name: '进入工作室', exact: true }).click();
  await expect(page).toHaveURL(/#team$/);
  await expect(page.locator('#team-heading')).toBeInViewport();
  for (const [label, id] of [['首页', 'home'], ['团队成员', 'team'], ['产品展厅', 'products'], ['共创故事', 'story'], ['联系我们', 'contact']]) {
    await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await expect(page.locator('a[href^="mailto:"], a[href^="tel:"], a[href="#"]')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('搜索、打开、关闭、Escape与键盘焦点恢复', async ({ page }) => {
  await page.goto('/#team');
  const search = page.getByRole('searchbox');
  await search.fill('视觉表达');
  await expect(page.getByRole('button', { name: /查看示例/ })).toHaveCount(1);
  const bubble = page.getByRole('button', { name: /查看示例 01/ });
  await bubble.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('示例资料 · 非真实成员');
  await expect(page.getByRole('button', { name: '关闭名片' })).toBeFocused();
  // 原生 dialog 将 Tab 焦点限制在弹窗内。
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(bubble).toBeFocused();
  await bubble.click();
  await page.getByRole('button', { name: '关闭名片' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '清除搜索', exact: true }).click();
  await expect(page.getByRole('button', { name: /查看示例/ })).toHaveCount(12);
  await search.fill('不存在的关键词');
  await expect(page.getByText('暂时没有找到同频的关键词。')).toBeVisible();
  await page.getByRole('button', { name: '清除搜索，看看所有伙伴' }).click();
  await expect(page.getByRole('button', { name: /查看示例/ })).toHaveCount(12);
});

test('减少动画、暂停漂浮与无横向溢出', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#team');
  expect(await page.locator('.member-bubble').first().evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: '暂停漂浮' }).click();
  expect(await page.locator('.member-bubble').first().evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await page.getByRole('button', { name: /查看示例 12/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '关闭名片' }).click();
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('45人容量、无重叠，每位成员均可找到并展开', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/fixtures/capacity.html');
  const bubbles = page.getByRole('button', { name: /查看容量示例/ });
  await expect(bubbles).toHaveCount(45);
  const rects = await bubbles.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
  }));
  rects.forEach((a, i) => rects.slice(i + 1).forEach(b => {
    expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBe(true);
  }));
  for (let index = 0; index < 45; index++) {
    await bubbles.nth(index).click();
    await expect(page.getByRole('dialog')).toContainText(`容量示例 ${index + 1}`);
    await page.getByRole('button', { name: '关闭名片' }).click();
  }
  await page.getByRole('searchbox').fill('容量示例 45');
  await expect(bubbles).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
