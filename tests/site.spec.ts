import { test, expect } from '@playwright/test';
import { members } from '../src/data/members';

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
  await expect(page.locator('.member-bubble')).toHaveCount(31);
  await search.fill(members[0].name);
  await expect(page.locator('.member-bubble')).toHaveCount(1);
  const bubble = page.locator('.member-bubble').first();
  await bubble.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 3 })).toHaveText(members[0].name);
  await expect(dialog).not.toContainText('示例资料');
  await expect(dialog.locator('dl')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '认识下一位' })).toBeDisabled();
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
  await expect(page.locator('.member-bubble')).toHaveCount(31);
  await search.fill('不存在的关键词');
  await expect(page.getByText('暂时没有找到同频的关键词。')).toBeVisible();
  await page.getByRole('button', { name: '清除搜索，看看所有伙伴' }).click();
  await expect(page.locator('.member-bubble')).toHaveCount(31);
});

test('减少动画、暂停漂浮与无横向溢出', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#team');
  expect(await page.locator('.bubble-surface').first().evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.locator('.bubble-surface').first().evaluate(node => getComputedStyle(node).animationName)).toBe('float');
  await page.getByRole('button', { name: '暂停漂浮' }).click();
  expect(await page.locator('.bubble-surface').first().evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await page.locator('.member-bubble').last().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '关闭名片' }).click();
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('两款产品与四格故事均可进入完整体验', async ({ page, request }) => {
  await page.goto('/#products');
  await expect(page.getByRole('heading', { name: '回音结', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '把感受剪成片', level: 3 })).toBeVisible();

  const experiences = [
    { name: /打开回音结完整体验/, path: '/experiences/echo-knot/index.html' },
    { name: /打开把感受剪成片完整体验/, path: '/experiences/feeling-film/index.html' },
    { name: /打开完整四格时间线互动体验/, path: '/experiences/story/index.html' },
  ];

  for (const experience of experiences) {
    await expect(page.getByRole('link', { name: experience.name })).toHaveAttribute('target', '_blank');
    const response = await request.get(experience.path);
    expect(response.ok()).toBe(true);
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: experience.name }).click();
    const popup = await popupPromise;
    const errors: string[] = [];
    popup.on('pageerror', error => errors.push(error.message));
    await popup.waitForLoadState('load');
    await expect(popup.locator('body')).not.toBeEmpty();
    expect(new URL(popup.url()).pathname).toBe(experience.path);
    expect(errors).toEqual([]);
    await popup.close();
  }

  await expect(page.locator('.story-act')).toHaveCount(4);
});

test('45人容量、无重叠，每位成员均可找到并展开', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/fixtures/capacity.html');
  const bubbles = page.locator('.member-bubble');
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
