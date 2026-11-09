import { test, expect } from '@playwright/test';
import { members } from '../src/data/members';
import { copy } from '../src/data/copy';

test('源码包32位成员均可搜索并展开原始名片', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#team');
  expect(members).toHaveLength(32);
  expect(new Set(members.map(member => member.id)).size).toBe(32);
  await expect(page.getByRole('button', { name: /^打开.*的名片$/ })).toHaveCount(32);
  for (const member of members) {
    await page.getByRole('searchbox').fill(member.name);
    const trigger = page.getByRole('button', { name: `打开${member.name}的名片`, exact: true });
    await trigger.click();
    await expect(page.locator('#member-card-name')).toHaveText(member.name);
    if (member.bio) await expect(page.locator('.member-bio')).toHaveText(member.bio);
    await expect(page.locator('.keyword-list li')).toHaveCount(member.keywords.length);
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  }
});

test('六位联系卡片顺序与32人墙在五种宽度正常', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#contact');
  await expect(page.locator('.contact-card')).toHaveCount(6);
  await expect(page.locator('.contact-card__name')).toHaveText(['冯丽娜Nivis', '于幸繁Struggle.呆', '陈佳阿若', '臧文琪呵', '余海燕@me', '刘艺莹六一']);
  await expect(page.getByRole('link', { name: '发邮件给余海燕：fercy666@163.com', exact: true })).toHaveAttribute('href', 'mailto:fercy666@163.com');
  for (const person of copy.contact.people) {
    await expect(page.getByRole('link', { name: `发邮件给${person.name}：${person.email}`, exact: true })).toHaveAttribute('href', `mailto:${person.email}`);
  }
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('navigation').getByRole('link', { name: '团队成员', exact: true }).click();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: '打开胡洁的名片', exact: true })).toBeVisible();
  }
});

test('保留原首页文字入场、流光和立体名片漂浮，减少动画可关闭', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('#home-heading')).toHaveCSS('animation-name', 'hero-rise');
  const line = page.locator('.fine-line');
  const initial = await line.evaluate(node => getComputedStyle(node).backgroundPositionX);
  await expect.poll(() => line.evaluate(node => getComputedStyle(node).backgroundPositionX)).not.toBe(initial);
  await page.getByRole('link', { name: '进入工作室', exact: true }).click();
  await expect(page.locator('.member-tile__float').first()).toHaveCSS('animation-name', 'tile-float');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.member-tile__float').first()).toHaveCSS('animation-name', 'none');
  await page.getByRole('navigation').getByRole('link', { name: '首页', exact: true }).click();
  await expect(page.locator('#home-heading')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#home-heading')).toHaveCSS('opacity', '1');
});
