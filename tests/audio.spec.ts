import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

async function probe(page: Page) {
  await page.addInitScript(() => {
    const audit: any = { contexts: [], outputs: [] }; (window as any).audioAudit = audit;
    const Base = window.AudioContext;
    window.AudioContext = class extends Base { constructor(...args: any[]) { super(...args); audit.contexts.push(this); } };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (target: any, ...args: any[]) {
      if (target instanceof AudioDestinationNode) { const analyser = this.context.createAnalyser(); analyser.fftSize = 2048; audit.outputs.push(analyser); connect.call(this, analyser); return (connect as any).call(analyser, target, ...args); }
      return (connect as any).call(this, target, ...args);
    };
  });
}
async function signal(page: Page) {
  return page.evaluate(async () => {
    let sum = 0, count = 0, peak = 0;
    for (let frame = 0; frame < 60; frame++) {
      await new Promise(requestAnimationFrame);
      for (const analyser of (window as any).audioAudit.outputs) { const samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples); for (const sample of samples) { sum += sample * sample; peak = Math.max(peak, Math.abs(sample)); count++; } }
    }
    const rms = Math.sqrt(sum / (count || 1));
    return { rms, peak, dbfs: rms ? 20 * Math.log10(rms) : null, states: (window as any).audioAudit.contexts.map((ctx: AudioContext) => ctx.state) };
  });
}
test('故事实际开声、刷新恢复、静音和再开声，电平足够且无削波', async ({ page }, info) => {
  await probe(page); await page.goto('/experiences/story/index.html');
  await page.getByRole('button', { name: '开启声音', exact: true }).click(); await page.waitForTimeout(1800);
  const first = await signal(page); expect(first.rms).toBeGreaterThan(.015); expect(first.peak).toBeLessThan(.95);
  await page.reload();
  await expect(page.getByRole('button', { name: '开启声音', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.sound-toggle__label')).toHaveText('点击开声');
  await page.getByRole('button', { name: '翻开第一幕', exact: true }).click();
  await expect(page.getByRole('button', { name: '关闭声音', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(1800); const restored = await signal(page); expect(restored.rms).toBeGreaterThan(.015); expect(restored.peak).toBeLessThan(.95);
  await page.getByRole('button', { name: '关闭声音', exact: true }).click(); await page.waitForTimeout(1400); expect((await signal(page)).rms).toBeLessThan(.0001);
  await page.getByRole('button', { name: '开启声音', exact: true }).click(); await page.waitForTimeout(1800); expect((await signal(page)).rms).toBeGreaterThan(.015);
  await writeFile(info.outputPath('story-levels.json'), JSON.stringify({ first, restored }, null, 2));
});
test('无音频API时故事不会显示声音已开', async ({ page }) => {
  await page.addInitScript(() => { (window as any).AudioContext = undefined; (window as any).webkitAudioContext = undefined; });
  await page.goto('/experiences/story/index.html'); await page.getByRole('button', { name: '开启声音', exact: true }).click();
  await expect(page.locator('.sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.sound-toggle__label')).toHaveText('点击开声');
});
test('剪片所有情绪均有适度音量，静音恢复与导出音轨正常', async ({ page }, info) => {
  test.setTimeout(90000); await probe(page); await page.goto('/experiences/feeling-film/index.html');
  await page.getByRole('navigation', { name: '页脚导航', exact: true }).getByRole('button', { name: '剪一段', exact: true }).click();
  const moods = await page.evaluate(() => Object.keys((window as any).App.data.moods)); const levels = [];
  for (const mood of moods) {
    await page.evaluate(key => (window as any).App.music.start(key, { hard: true }), mood); await page.waitForTimeout(3500);
    const level = await signal(page); expect(level.rms).toBeGreaterThan(.01); expect(level.rms).toBeLessThan(.25); expect(level.peak).toBeLessThan(.95); levels.push({ mood, ...level });
  }
  await page.evaluate(() => (window as any).App.music.setMuted(true)); await page.waitForTimeout(900); expect((await signal(page)).rms).toBeLessThan(.0001);
  await page.evaluate(() => (window as any).App.music.setMuted(false)); await page.waitForTimeout(500); expect((await signal(page)).rms).toBeGreaterThan(.01);
  expect(await page.evaluate(() => (window as any).App.music.stream().getAudioTracks().map((track: MediaStreamTrack) => track.readyState))).toEqual(['live']);
  await writeFile(info.outputPath('film-levels.json'), JSON.stringify(levels, null, 2));
});

