import { test, expect } from '@playwright/test';
import { members } from '../src/data/members';

test('立体视图32人都可搜索打开，切换名片保留原文', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#team');
  await page.getByRole('button', { name: '立体名片', exact: true }).click();
  await expect(page.locator('.member-tile')).toHaveCount(32);
  for (const member of members) {
    await page.getByRole('searchbox').fill(member.name);
    const trigger = page.getByRole('button', { name: `打开${member.name}的名片`, exact: true });
    await trigger.click();
    await expect(page.locator('#member-card-name')).toHaveText(member.name);
    if (member.intro) await expect(page.locator('.member-intro p')).toHaveText(member.intro);
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  }
});

test('两种成员视图共享筛选暂停与连续浏览，五种宽度可用', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#team');
  await page.getByRole('button', { name: '暂停星河', exact: true }).click();
  await page.getByRole('button', { name: '立体名片', exact: true }).click();
  await expect(page.locator('.member-gallery')).toHaveAttribute('data-paused', 'true');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const trigger = page.getByRole('button', { name: '打开胡洁的名片', exact: true });
    await trigger.click();
    await expect(page.locator('#member-card-name')).toHaveText('胡洁');
    await page.getByRole('button', { name: '认识下一位', exact: true }).click();
    await expect(page.locator('#member-card-name')).toHaveText(members[0].name);
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('combobox').selectOption('开朗');
  await expect(page.getByRole('button', { name: /^打开.*的名片$/ })).toHaveCount(3);
  await page.getByRole('button', { name: '∞ 星河轨道', exact: true }).click();
  await expect(page.locator('.member-bubble')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '恢复星河', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '清除筛选，返回全部', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('32');
});

test('章节导航支持前进后退，离开团队会关闭名片并恢复滚动', async ({ page }) => {
  await page.goto('/#home');
  await page.getByRole('link', { name: '进入工作室', exact: true }).click();
  await page.getByRole('searchbox').fill('胡洁');
  await page.getByRole('button', { name: '查看胡洁的名片', exact: true }).click();
  await page.goBack();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.locator('body').evaluate(node => node.style.overflow)).not.toBe('hidden');
  await page.goForward();
  await expect(page.locator('#team')).toBeVisible();
  await expect(page.locator('#home')).toBeHidden();
  await page.reload();
  await expect(page.locator('#team')).toBeVisible();
});
