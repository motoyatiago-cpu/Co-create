import { test, expect } from '@playwright/test';
import { members } from '../src/data/members';
import { copy } from '../src/data/copy';
import { publicMemberContacts } from '../src/data/memberPresentation';
import { readFileSync } from 'node:fs';
const contactCounts: Record<string, number> = JSON.parse(readFileSync('tests/fixtures/contact-counts.json', 'utf8'));

test('成员墙四位优先展示，其他人保留原序且媒体ID不变', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/#team');
  const priority = ['member-08', 'member-01', 'member-10', 'member-16'];
  const expected = [...priority, ...members.filter(member => !priority.includes(member.id)).map(member => member.id)];
  await expect(page.locator('.member-tile')).toHaveCount(32);
  expect(await page.locator('.member-tile').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.memberId))).toEqual(expected);
  expect(await page.locator('.member-tile__name').allTextContents()).toEqual([
    '冯丽娜', '臧文琪', '于幸繁', '陈佳', ...members.filter(member => !priority.includes(member.id)).map(member => member.name),
  ]);
  await page.getByRole('searchbox').fill('拼音');
  await expect(page.locator('.member-tile:not([hidden])')).toHaveAttribute('data-member-id', 'member-27');
  await expect(page.locator('[data-member-id="member-27"] img')).toHaveAttribute('src', '/team/avatars/member-27.png');
});

test('32位名片对应Excel全部已填联系方式、空项隐藏并保留原公开邮箱', async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/#team');
  expect(Object.values(contactCounts).filter(Boolean)).toHaveLength(28);
  for (const member of members) {
    await page.getByRole('searchbox').fill(member.name);
    const tile = page.getByRole('button', { name: `打开${member.name}的名片`, exact: true });
    await tile.click();
    const contacts = publicMemberContacts[member.id];
    const extraEmail = ['member-01', 'member-08', 'member-10'].includes(member.id) ? 1 : 0;
    expect(contacts).toHaveLength(contactCounts[member.id] + extraEmail);
    await expect(page.locator('.member-contact dl > div')).toHaveCount(contacts.length);
    for (const contact of contacts) {
      await expect(page.locator('.member-contact dd').filter({ hasText: contact.value })).toHaveCount(1);
      if (contact.href) await expect(page.getByRole('dialog').locator(`a[href="${contact.href}"]`)).toHaveCount(1);
    }
    if (!contacts.length) await expect(page.locator('.member-contact')).toHaveCount(0);
    await page.keyboard.press('Escape'); await expect(tile).toBeFocused();
  }
  for (const person of copy.contact.people) {
    await page.getByRole('searchbox').fill(person.name);
    const tile = page.getByRole('button', { name: `打开${person.name}的名片`, exact: true });
    await tile.click();
    const contact = page.getByRole('dialog').getByRole('link', { name: `发邮件给${person.name}：${person.email}`, exact: true });
    await expect(contact).toHaveAttribute('href', `mailto:${person.email}`);
    await expect(contact).toBeVisible();
    await page.keyboard.press('Escape'); await expect(tile).toBeFocused();
  }
  await page.getByRole('searchbox').fill('拼音');
  await page.getByRole('button', { name: '打开拼音的名片', exact: true }).click();
  await expect(page.locator('.member-contact')).toContainText('Yeepy_18');
  await expect(page.locator('#member-card-name')).toHaveText('拼音');
});

test('同一构建主站产品入口通向已合并的AI文学回声', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#products');
  const entry = page.getByRole('link', { name: /打开回音结完整体验/ });
  const href = await entry.getAttribute('href'); expect(href).toBeTruthy();
  await page.goto(href!);
  await page.getByRole('link', { name: '共鸣', exact: true }).first().click();
  const panel = page.locator('echo-literary-chat'); await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'AI文学回声', exact: true }).click();
  await expect(panel.locator('textarea')).toBeVisible();
  await expect(page.locator('.index-row')).toHaveCount(10);
  await panel.getByRole('button', { name: '本地回声', exact: true }).click();
  await expect(page.locator('.chat-form')).toBeVisible();
  expect(errors).toEqual([]);
});
