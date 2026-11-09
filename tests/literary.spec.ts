import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const pack = JSON.parse(readFileSync(resolve('public/experiences/echo-knot/literary/personas.json'), 'utf8'));
const endpoint = 'https://literary-test.example/v1/chat/completions';
const key = 'test-fixture-not-a-real-api-key';
const ids: Record<string, string> = { libai: 'li_bai', sushi: 'su_shi', liqingzhao: 'li_qingzhao', xinqiji: 'xin_qiji', wangwei: 'wang_wei', dufu: 'du_fu', nalan: 'nalan_xingde', luxun: 'lu_xun', quyuan: 'qu_yuan', taoyuanming: 'tao_yuanming' };
const panel = (page: Page) => page.locator('echo-literary-chat');
async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/experiences/echo-knot/index.html#/共鸣');
  await expect(panel(page)).toBeVisible();
  await panel(page).getByRole('button', { name: 'AI文学回声', exact: true }).click();
  await expect(panel(page).getByRole('button', { name: '发送AI回声', exact: true })).toBeEnabled();
}
async function configure(page: Page) {
  const settings = panel(page).locator('details');
  if (!await settings.evaluate(node => (node as HTMLDetailsElement).open)) await settings.locator('summary').click();
  await panel(page).getByLabel('Base URL', { exact: true }).fill(endpoint);
  await panel(page).getByLabel('Model ID', { exact: true }).fill('mock-browser');
  await panel(page).getByLabel('API Key', { exact: true }).fill(key);
  await settings.locator('summary').click();
}
async function send(page: Page, text: string) {
  await panel(page).locator('textarea').fill(text);
  await panel(page).getByRole('button', { name: '发送AI回声', exact: true }).click();
  await expect(panel(page).getByRole('button', { name: '发送AI回声', exact: true })).toBeEnabled();
}
async function select(page: Page, name: string) {
  await page.locator('.index-row').filter({ has: page.getByText(name, { exact: true }) }).click();
  await expect(panel(page).locator('.literary-heading')).toHaveText(`和${name}的AI会话`);
}

test('十人人设、三次追问、A/B隔离、刷新与导出；桌面手机截图', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  await page.route(endpoint, async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    expect(route.request().headers().authorization).toBe('Bearer ' + key);
    expect(body.response_format).toBeUndefined();
    await route.fulfill({ json: { choices: [{ message: { content: '【模拟接口测试】已收到本人物的消息；此内容用于验证接入，不是模型实测。' } }], usage: { prompt_tokens: 35, completion_tokens: 20 } } });
  });
  await open(page); await configure(page);
  await expect(page.locator('.index-row')).toHaveCount(10);
  for (const [uiId, id] of Object.entries(ids)) {
    const persona = pack.personas.find((item: { id: string }) => item.id === id);
    await select(page, persona.name);
    await send(page, `私密标记-${id}：我总觉得自己走得太慢，别人都比我厉害`);
    const request = requests.at(-1)!;
    expect(request.messages[0].content).toContain(persona.prompt);
    expect(request.messages).toHaveLength(2);
    await expect(panel(page)).toHaveAttribute('persona-id', uiId);
    await expect(panel(page).locator('.literary-author').last()).toContainText('AI生成');
  }
  await select(page, '李白');
  for (let i = 1; i <= 3; i++) await send(page, `追问${i}：刚才说过的慢，怎么面对？`);
  expect(requests.at(-1)!.messages.some(item => item.content.includes('私密标记-li_bai'))).toBe(true);
  expect(JSON.stringify(requests.at(-1))).not.toContain('私密标记-su_shi');
  await select(page, '苏轼'); await expect(panel(page).locator('.literary-message')).toHaveCount(2);
  await select(page, '李白'); await expect(panel(page).locator('.literary-message')).toHaveCount(8);
  const downloadPromise = page.waitForEvent('download');
  await panel(page).getByRole('button', { name: '导出此人AI对话', exact: true }).click();
  const download = await downloadPromise; const file = await download.path();
  const exported = readFileSync(file!, 'utf8'); expect(exported).toContain('私密标记-li_bai'); expect(exported).not.toContain(key); expect(exported).not.toContain('私密标记-su_shi');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: testInfo.project.name === 'mobile' ? 390 : 1440, height: testInfo.project.name === 'mobile' ? 844 : 1000 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(testInfo.project.name === 'mobile' ? 390 : 1440);
  await page.waitForTimeout(150); // Allow the original canvas/viewport resize handler to settle before capture.
  await panel(page).scrollIntoViewIfNeeded();
  await panel(page).locator('.literary-heading').click();
  mkdirSync('evidence/echo-literary', { recursive: true });
  await page.screenshot({ path: `evidence/echo-literary/${testInfo.project.name}.png`, fullPage: true });
  await page.reload(); await panel(page).getByRole('button', { name: 'AI文学回声', exact: true }).click();
  await expect(panel(page).locator('.literary-message')).toHaveCount(8);
  await expect(panel(page).getByLabel('API Key', { exact: true })).toHaveValue('');
  await panel(page).getByLabel('API Key', { exact: true }).fill(key);
  await panel(page).getByRole('button', { name: '清除AI密钥', exact: true }).click();
  await expect(panel(page).getByLabel('API Key', { exact: true })).toHaveValue('');
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(key); expect(errors).toEqual([]);
});

test('无配置、空回复、429、跨域失败可回到原本地引擎；清空只影响指定范围', async ({ page }) => {
  await open(page); await send(page, '没有配置也不会假装生成');
  await expect(panel(page).getByRole('status')).toContainText('Base URL');
  await configure(page);
  for (const failure of ['empty', '429', 'network']) {
    await page.route(endpoint, route => failure === 'network' ? route.abort('failed') : route.fulfill({ status: failure === '429' ? 429 : 200, json: { choices: [{ message: { content: '' } }] } }));
    await send(page, failure);
    await expect(panel(page).getByRole('status')).toContainText(failure === 'empty' ? '空文本' : failure === '429' ? '429' : '跨域');
    await page.unroute(endpoint);
  }
  await expect(panel(page).locator('.is-assistant')).toHaveCount(0);
  await panel(page).getByRole('button', { name: '返回本地回声', exact: true }).click();
  await expect(page.locator('.chat-form')).toBeVisible();
  await page.locator('#chat-input').fill('你好'); await page.getByRole('button', { name: '说给对方听', exact: true }).click();
  await expect(page.locator('.chat-messages .is-companion')).toHaveCount(2);
  await panel(page).getByRole('button', { name: 'AI文学回声', exact: true }).click();
  page.on('dialog', dialog => dialog.accept());
  await panel(page).getByRole('button', { name: '清空此人AI对话', exact: true }).click();
  await expect(panel(page).locator('.literary-message')).toHaveCount(0);
  await panel(page).getByRole('button', { name: '清空全部AI对话', exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('echo-knot:literary:sessions:v1'))).toBe('{}');
});

test('重复发送、停止等待、切人、离页清理、迟到响应；键盘可切换', async ({ page }) => {
  let calls = 0;
  await page.route(endpoint, async route => { calls++; await new Promise(done => setTimeout(done, 700)); await route.fulfill({ json: { choices: [{ message: { content: '迟到回复' } }] } }).catch(() => {}); });
  await open(page); await configure(page);
  await panel(page).locator('textarea').fill('不要重复发送');
  await panel(page).locator('textarea').press('Enter');
  await panel(page).locator('textarea').press('Enter');
  await expect(panel(page).getByRole('button', { name: '等待回声……' })).toBeDisabled();
  await panel(page).getByRole('button', { name: '停止等待', exact: true }).click();
  await expect(panel(page).getByRole('status')).toContainText('停止等待');
  await select(page, '苏轼');
  await page.waitForTimeout(800); await expect(panel(page).locator('.literary-message')).toHaveCount(0);
  expect(calls).toBe(1);
  const local = panel(page).getByRole('button', { name: '本地回声', exact: true });
  await local.focus(); await page.keyboard.press('Enter'); await expect(page.locator('.chat-form')).toBeVisible();
  await panel(page).getByRole('button', { name: 'AI文学回声', exact: true }).click();
  await panel(page).locator('textarea').fill('离开页面时取消'); await panel(page).locator('textarea').press('Enter');
  await page.getByRole('link', { name: '回音簿', exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('link', { name: '共鸣', exact: true }).first().click();
  await panel(page).getByRole('button', { name: 'AI文学回声', exact: true }).click();
  await expect(panel(page).locator('.is-assistant')).toHaveCount(0);
});

test('旧版Key迁移清理，原设置与原解结JSON协议保持可用', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('回音结·偏好', JSON.stringify({ external: { enabled: false, endpoint: 'https://legacy.example/v1', model: 'legacy', key: 'legacy-test-only-key' } })));
  await open(page);
  expect(await page.evaluate(() => localStorage.getItem('回音结·偏好'))).not.toContain('legacy-test-only-key');
  await page.getByRole('link', { name: '设置', exact: true }).first().click();
  await expect(page.locator('#engine-key')).toHaveValue('');
  await page.locator('#engine-key').fill(key);
  await page.locator('#engine-endpoint').fill('https://legacy-test.example/v1');
  await page.locator('#engine-model').fill('mock-legacy');
  await page.getByRole('switch', { name: '允许使用外部引擎', exact: true }).click();
  await page.route('https://legacy-test.example/v1/chat/completions', async route => {
    const body = route.request().postDataJSON();
    expect(body.messages[0].content).toContain('JSON');
    expect(body.messages[0].content).toContain('reads');
    await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ reads: [{ text: '可能是累了', cue: '随便吧' }], reflection: '先确认语境', reply: '想先休息吗？' }) } }] } });
  });
  const result = await page.evaluate(async () => {
    const api = (window as unknown as { HuiYinJie: { 深度解结: (input: { message: string }) => Promise<{ 成功: boolean }> } }).HuiYinJie;
    return api.深度解结({ message: '随便吧。' });
  });
  expect(result.成功).toBe(true);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => localStorage.getItem('回音结·偏好'))).not.toContain(key);
  await expect(page.getByText('密钥只在当前页面内存中使用，刷新需重填。', { exact: false })).toBeVisible();
});
