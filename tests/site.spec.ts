import { test, expect } from '@playwright/test';

test('首页、五区导航与进入按钮', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const failed: string[] = [];
  page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('最正经的1组');
  await expect(page.locator('.hero-art img')).toHaveJSProperty('naturalWidth', 1100);
  await expect(page.locator('.hero-nebula canvas')).toHaveCount(1);
  await expect(page.locator('.hero')).toHaveClass(/nebula-ready/);
  await page.getByRole('link', { name: '进入工作室', exact: true }).click();
  await expect(page).toHaveURL(/#team$/);
  await expect(page.locator('#team-heading')).toBeInViewport();
  for (const [label, id] of [['首页', 'home'], ['团队成员', 'team'], ['产品展厅', 'products'], ['共创故事', 'story'], ['联系我们', 'contact']]) {
    await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
    await expect(page.locator('[data-chapter]:visible')).toHaveCount(1);
    await expect(page.locator('[data-chapter]:visible')).toHaveAttribute('id', id);
  }
  await expect(page.locator('a[href^="tel:"], a[href="#"]')).toHaveCount(0);
  await expect(page.locator('.contact-card')).toHaveCount(4);
  for (const email of ['cclia1126@gmail.com', 'cuijun202608@163.com', '2731161093@qq.com', 'strggle521yu@163.com']) {
    await expect(page.locator(`a[href="mailto:${email}"]`)).toBeVisible();
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('搜索、打开、关闭、Escape与键盘焦点恢复', async ({ page }) => {
  await page.goto('/#team');
  const search = page.getByRole('searchbox');
  await search.fill('游戏设计');
  await expect(page.getByRole('button', { name: /打开.*的名片/ })).toHaveCount(1);
  const tile = page.getByRole('button', { name: '打开冯丽娜的名片' });
  await tile.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('认识一位共创伙伴');
  await expect(dialog).toContainText('冯丽娜');
  await expect(page.getByRole('button', { name: '关闭名片' })).toBeFocused();
  // 原生 dialog 将 Tab 焦点限制在弹窗内。
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(tile).toBeFocused();
  await tile.click();
  await page.getByRole('button', { name: '关闭名片' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: '清除搜索', exact: true }).click();
  await expect(page.getByRole('button', { name: /打开.*的名片/ })).toHaveCount(32);
  await search.fill('不存在的关键词');
  await expect(page.getByText('暂时没有找到同频的关键词。')).toBeVisible();
  await page.getByRole('button', { name: '清除搜索，看看所有伙伴' }).click();
  await expect(page.getByRole('button', { name: /打开.*的名片/ })).toHaveCount(32);
});

test('减少动画、暂停漂浮与无横向溢出', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#team');
  expect(await page.locator('.member-tile__float').first().evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: '暂停漂浮' }).click();
  expect(await page.locator('.member-tile__float').first().evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await page.getByRole('button', { name: '打开钱韵秋的名片' }).click();
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

  const productExperiences = [
    { name: /打开回音结完整体验/, path: '/experiences/echo-knot/index.html' },
    { name: /打开把感受剪成片完整体验/, path: '/experiences/feeling-film/index.html' },
  ];

  for (const experience of productExperiences) {
    await expect(page.getByRole('link', { name: experience.name })).toHaveAttribute('target', '_blank');
    const response = await request.get(experience.path);
    expect(response.ok()).toBe(true);
  }

  await page.getByRole('navigation').getByRole('link', { name: '共创故事', exact: true }).click();
  await expect(page.locator('#story')).toBeInViewport();
  const storyExperience = { name: /打开完整四格时间线互动体验/, path: '/experiences/story/index.html' };
  await expect(page.getByRole('link', { name: storyExperience.name })).toHaveAttribute('target', '_blank');
  const storyResponse = await request.get(storyExperience.path);
  expect(storyResponse.ok()).toBe(true);
  await expect(page.locator('.story-act')).toHaveCount(4);
});

test('45人容量、每张名片可点击，每位成员均可找到并展开', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/fixtures/capacity.html');
  const tiles = page.getByRole('button', { name: /打开容量示例/ });
  await expect(tiles).toHaveCount(45);
  // 3D 透视下矩形会因深度重叠，改为验证每张名片中心点仍由自己接收点击。
  const blocked = await tiles.evaluateAll(nodes => nodes.flatMap((node, index) => {
    node.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    const rect = node.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit && node.contains(hit) ? [] : [index + 1];
  }));
  expect(blocked).toEqual([]);
  for (let index = 0; index < 45; index++) {
    await tiles.nth(index).click();
    await expect(page.getByRole('dialog')).toContainText(`容量示例 ${index + 1}`);
    await page.getByRole('button', { name: '关闭名片' }).click();
  }
  await page.getByRole('searchbox').fill('容量示例 45');
  await expect(tiles).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
