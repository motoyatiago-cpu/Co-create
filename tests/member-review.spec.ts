import { test, expect } from '@playwright/test';
import { members } from '../src/data/members';
import { readFileSync } from 'node:fs';
const counts: Record<string, number> = JSON.parse(readFileSync('tests/fixtures/gallery-counts.json', 'utf8'));

test('32位成员的候选图库精确绑定，首图按需加载，多图切换与焦点恢复', async ({ page }) => {
  test.setTimeout(90000);
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/__local_review__/images/')) requests.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/#team');
  expect(requests).toHaveLength(0);
  for (const member of members) {
    const number = member.id.slice(-2), count = counts[number as keyof typeof counts];
    await page.getByRole('searchbox').fill(member.name);
    const trigger = page.getByRole('button', { name: `打开${member.name}的名片`, exact: true });
    await trigger.click();
    const gallery = page.getByRole('region', { name: '个人图片画廊', exact: true });
    if (!count) await expect(gallery).toHaveCount(0);
    else {
      await expect(gallery).toHaveAttribute('data-member-id', member.id);
      await expect(gallery.locator('figcaption')).toHaveText(`1 / ${count}`);
      await expect(gallery.locator('img')).toHaveCount(1);
      await expect(gallery.locator('img')).toHaveJSProperty('complete', true);
      expect(await gallery.locator('img').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect(gallery.locator('img')).toHaveAttribute('src', new RegExp(`/member-${number}-`));
      if (count > 1) {
        await gallery.getByRole('button', { name: '下一张个人图片', exact: true }).click();
        await expect(gallery.locator('figcaption')).toHaveText(`2 / ${count}`);
        await expect(gallery.locator('img')).toHaveAttribute('loading', 'lazy');
        await gallery.getByRole('button', { name: '上一张个人图片', exact: true }).click();
      }
    }
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  }
  expect(counts['03']).toBe(0); expect(counts['15']).toBe(0); expect(counts['28']).toBe(0);
});

test('大图、Escape层级、键盘与触屏滑动在六种宽度正常', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/#team');
  await page.getByRole('searchbox').fill('余海燕');
  const trigger = page.getByRole('button', { name: '打开余海燕的名片', exact: true }); await trigger.click();
  const gallery = page.getByRole('region', { name: '个人图片画廊', exact: true });
  await expect(gallery.locator('figcaption')).toHaveText('1 / 9');
  const photo = gallery.getByRole('button', { name: '查看大图', exact: true });
  await photo.focus(); await page.keyboard.press('ArrowRight'); await expect(gallery.locator('figcaption')).toHaveText('2 / 9');
  await photo.click(); await expect(page.locator('.member-card')).toHaveClass(/with-photo-viewer/);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible();
  await expect(photo).toBeFocused();
  if (isMobile) {
    await photo.scrollIntoViewIfNeeded(); const rect = (await photo.boundingBox())!;
    const session = await page.context().newCDPSession(page);
    const y = rect.y + Math.min(80, rect.height / 2), x = rect.x + rect.width * .8;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 90, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(gallery.locator('figcaption')).toHaveText('3 / 9');
  }
  for (const width of [320,375,390,768,1024,1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    const rect = await page.getByRole('dialog').boundingBox(); expect(rect!.width).toBeLessThanOrEqual(width);
  }
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('button', { name: '收起名片', exact: true }).click();
  await expect(trigger).toBeFocused();
});

test('共创材料克制展开，原四幕不变，风险素材不由审核服务提供', async ({ page, request }) => {
  await page.goto('/#story'); await expect(page.locator('.story-act')).toHaveCount(4);
  await page.locator('.story-materials summary').click();
  await expect(page.locator('.story-materials img')).toHaveCount(2);
  await expect(page.locator('.story-materials')).toContainText('圆桌会构想，非全部已实装功能');
  for (const file of ['co_create_discussion_record.webp','image4.jpeg','image38.jpeg','image44.jpeg','manifest.json']) {
    expect((await request.get(`/__local_review__/images/${file}`)).status()).toBe(404);
  }
});
