import { test, expect } from '@playwright/test';
import { members } from '../src/data/members';
import { batchCount, expectNoOverlap, readAllBatches } from './orbitHelpers';

test('公开数据逐字展示、缺省字段与昵称规则', async ({ page }, testInfo) => {
  // 对应交付截图的手机视口；其余移动用例继续覆盖设备默认的较矮视口。
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#team');
  await expect(page.locator('.orbit-stage')).toBeVisible();
  expect(members).toHaveLength(31);
  expect(new Set(members.map(member => member.id)).size).toBe(31);
  await expect(page.locator('.bubble-name')).toHaveText(members.slice(0, batchCount(page, members.length)).map(member => member.name));
  expect(await readAllBatches(page)).toEqual(members.map(member => member.name));
  expect(members.every(member => !member.isExample)).toBe(true);
  expect(members.some(member => member.name === '拼音')).toBe(true);
  expect(members.every(member => !member.avatarUrl && !member.role && !member.strengths && !member.learning)).toBe(true);
  // 不只测试一个关键词形态：真实资料包含0、1、6个关键词与缺介绍记录。
  const cases = [members.find(member => member.keywords.length === 0)!, members.find(member => member.keywords.length === 1)!, members.find(member => member.keywords.length >= 6)!, members.find(member => !member.intro)!, members.find(member => member.name === '拼音')!];
  for (const member of cases) {
    await page.getByRole('searchbox').fill(member.name);
    await page.getByRole('button', { name: `查看${member.name}的名片`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { level: 3 })).toHaveText(member.name);
    if (member.intro) await expect(dialog.locator('.member-intro p')).toHaveText(member.intro);
    else await expect(dialog.getByText('这位伙伴暂未填写个人介绍。')).toBeVisible();
    await expect(dialog.locator('.keyword-list li')).toHaveCount(member.keywords.length);
    await expect(dialog.locator('dl')).toHaveCount(0);
    await page.getByRole('button', { name: '关闭名片' }).click();
  }
});

test('关键词来自原话、组合搜索、连续浏览与首尾循环', async ({ page }) => {
  await page.goto('/#team');
  await page.getByRole('button', { name: '暂停星河' }).click();
  const choices = [...new Set(members.flatMap(member => member.keywords))];
  const select = page.getByRole('combobox', { name: '按成员自填关键词探索' });
  const values = await select.locator('option').evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value).filter(Boolean));
  expect(values.sort()).toEqual([...choices].sort());
  const repeated = choices.find(keyword => members.filter(member => member.keywords.includes(keyword)).length > 1)!;
  expect(repeated).toBeTruthy();
  const expected = members.filter(member => member.keywords.includes(repeated));
  await select.selectOption(repeated);
  await expect(page.locator('.bubble-name')).toHaveText(expected.map(member => member.name));
  const opener = page.locator('.member-bubble').first();
  await opener.focus();
  await opener.press('Enter');
  const dialog = page.getByRole('dialog');
  const next = dialog.getByRole('button', { name: '认识下一位' });
  // Shift+Tab从关闭按钮进入最后一个控件，使用键盘切换并保持同一焦点。
  await page.keyboard.press('Shift+Tab');
  await expect(next).toBeFocused();
  for (let index = 1; index <= expected.length; index++) {
    await next.press('Enter');
    await expect(dialog.getByRole('heading', { level: 3 })).toHaveText(expected[index % expected.length].name);
    await expect(next).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '关闭名片' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await page.getByRole('searchbox').fill(expected[0].name);
  await expect(page.locator('.bubble-name')).toHaveText([expected[0].name]);
  await page.getByRole('searchbox').fill('没有这一位测试伙伴');
  await expect(page.locator('.member-bubble')).toHaveCount(0);
  await page.getByRole('button', { name: '清除筛选，返回全部' }).click();
  await expect(select).toHaveValue('');
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.locator('.member-bubble')).toHaveCount(batchCount(page, 31));
  const withNickname = members.find(member => member.nickname && member.nickname !== member.name)!;
  await page.getByRole('searchbox').fill(withNickname.nickname!);
  await expect(page.getByRole('button', { name: `查看${withNickname.name}的名片`, exact: true })).toBeVisible();
  const withIntro = members.find(member => member.intro)!;
  await page.getByRole('searchbox').fill(withIntro.intro!);
  await expect(page.locator('.bubble-name')).toHaveText([withIntro.name]);
});

test('缺省与长内容fixture在四种视口正常，触屏仍可操作', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/fixtures/capacity.html');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bubbles = page.locator('.member-bubble');
    await expect(bubbles).toHaveCount(batchCount(page, 45));
    await expectNoOverlap(page);
    if (testInfo.project.name === 'mobile') await bubbles.nth(1).tap();
    else await bubbles.nth(1).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const rect = await dialog.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.width).toBeLessThanOrEqual(width);
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await dialog.getByRole('button', { name: '认识下一位' }).click();
    await expect(dialog.getByRole('heading', { level: 3 })).toHaveText('容量示例 3');
    await page.getByRole('button', { name: '关闭名片' }).click();
  }
  await page.getByRole('searchbox').fill('测试昵称');
  await expect(page.locator('.member-bubble')).toHaveCount(1);
});
