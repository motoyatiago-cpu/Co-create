import { test, expect } from '@playwright/test';
import { members } from '../src/data/members';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { approvedMemberGalleries } from '../src/data/memberGalleries';

test('长成员墙只加载临近视口头像，搜索和滚动仍能加载后段成员', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const images: string[] = [];
  page.on('request', request => { if (/\/team\/avatars\/member-/.test(request.url())) images.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('.member-tile img[src]')).toHaveCount(0);
  await page.getByRole('link', { name: '进入工作室', exact: true }).click();
  await page.locator('.member-tile').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.member-tile img[src]').first()).toHaveJSProperty('naturalWidth', 512);
  expect(images.length).toBeLessThan(20);
  await page.getByRole('searchbox').fill('张延博');
  await expect(page.locator('[data-member-id="member-32"] img')).toHaveJSProperty('naturalWidth', 512);
});

test('生产32张卡昵称与关键词分开、32头像一致、匿名与正式资料完整', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await expect(page.getByText('工作室名称与口号暂定', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '进入工作室', exact: true }).click();
  expect(members.map(member => member.id)).toEqual(Array.from({ length: 32 }, (_, index) => `member-${String(index + 1).padStart(2,'0')}`));
  for (const member of members) {
    expect(member.avatarGender).toBe(['member-10','member-30','member-32'].includes(member.id) ? 'male' : 'female');
    await page.getByRole('searchbox').fill(member.name);
    const tile = page.locator(`[data-member-id="${member.id}"]`);
    await expect(tile.locator('img')).toHaveAttribute('src', member.avatarUrl!);
    if (!member.nickname) await expect(tile.locator('[data-kind="nickname"]')).toHaveCount(0);
    await tile.click();
    if (!member.nickname || member.nickname === member.name) await expect(page.locator('.member-nickname')).toHaveCount(0);
    await expect(page.getByRole('region', { name: '个人图片画廊', exact: true })).toHaveCount(approvedMemberGalleries[member.id]?.length ? 1 : 0);
    await expect(page.locator('.member-avatar img')).toHaveJSProperty('naturalWidth', 512);
    await page.keyboard.press('Escape'); await expect(tile).toBeFocused();
  }
  for (const number of [5,6,16,29,31]) expect(members[number - 1].nickname).toBeUndefined();
  expect(members[26].name).toBe('拼音'); expect(members[26].nickname).toBe('拼音');
  expect(members.every(member => !member.isExample)).toBe(true);
});

test('生产仅包含获准图片，排除工作簿、审核接口及风险截图', async ({ page, request }) => {
  const files: string[] = [];
  const walk = (dir: string) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else files.push(path); } };
  walk('dist');
  expect(files.some(path => /gallery_review_only|story_review_only|\.xlsx$|\.pdf$|image(?:4|38|44)\.jpeg/.test(path))).toBe(false);
  const main = files.filter(path => /assets.*\.js$/.test(path)).map(path => readFileSync(path,'utf8')).join('');
  expect(main).not.toContain('/__local_review__/');
  expect(main).not.toContain('co_create_discussion_record.webp');
  expect(files.filter(path => /team[\\/]gallery[\\/].*\.webp$/.test(path))).toHaveLength(55);
  expect(files.filter(path => /story[\\/]materials[\\/].*\.webp$/.test(path))).toHaveLength(2);
  await page.goto('/#story'); await expect(page.locator('.story-materials')).toHaveCount(1);
  await page.locator('.story-materials summary').click();await expect(page.locator('.story-materials img')).toHaveCount(2);
  expect((await request.get('/__local_review__/images/member-01-01.webp')).headers()['content-type']).not.toContain('image/');
});
