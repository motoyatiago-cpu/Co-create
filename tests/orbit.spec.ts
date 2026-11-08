import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { members } from '../src/data/members';
import { createGeometry, separate, targetsAt } from '../src/components/orbit/orbitGeometry';
import { expectNoOverlap } from './orbitHelpers';

async function enterOrbit(page: Page) {
  const stage = page.locator('.orbit-stage');
  await stage.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(stage).toHaveAttribute('data-ready', 'true');
  return stage;
}

test('完整120秒轨迹采样：31/45人、窄屏和循环接点均无圆形碰撞或跳位', async () => {
  test.setTimeout(45000);
  for (const [width, height, size, count] of [[1280, 820, 88, 31], [928, 820, 80, 31], [1280, 1000, 72, 45], [928, 1000, 70, 45], [335, 480, 76, 8], [265, 480, 68, 8]]) {
    const geometry = createGeometry(width, height, size);
    const initial = separate(targetsAt(geometry, count, .017), geometry);
    let previous = initial;
    let maximumStep = 0, minimumGap = Infinity;
    for (let frame = 1; frame <= 7200; frame++) {
      const points = separate(targetsAt(geometry, count, .017 + frame / 7200), geometry);
      for (let i = 0; i < points.length; i++) {
        maximumStep = Math.max(maximumStep, Math.hypot(points[i].x - previous[i].x, points[i].y - previous[i].y));
        for (let j = i + 1; j < points.length; j++) minimumGap = Math.min(minimumGap, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
      }
      previous = points;
    }
    expect(maximumStep).toBeLessThan(4);
    expect(minimumGap).toBeGreaterThanOrEqual(size);
    previous.forEach((point, index) => expect(Math.hypot(point.x - initial[index].x, point.y - initial[index].y)).toBeLessThan(.01));
  }
});

test('真实流动、选中暂停、光圈、下一位、自动恢复与手动暂停独立', async ({ page }) => {
  await page.goto('/#team');
  const stage = await enterOrbit(page);
  await expect(stage).toHaveAttribute('data-running', 'true');
  const initial = await stage.getAttribute('data-phase');
  await expect.poll(() => stage.getAttribute('data-phase')).not.toBe(initial);
  const opener = page.locator('.member-bubble').first();
  await opener.focus(); await opener.press('Enter');
  await expect(stage).toHaveAttribute('data-pause-reason', 'selected');
  const phase = await stage.getAttribute('data-phase');
  await page.waitForTimeout(220);
  await expect(stage).toHaveAttribute('data-phase', phase!);
  await expect(page.locator('.member-bubble[data-selected]')).toHaveCount(1);
  await expect.poll(() => page.locator('.member-bubble[data-selected] .planet-body').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a)).toBeGreaterThan(1.25);
  await expect.poll(() => page.locator('.member-bubble[data-selected] .selection-ring').evaluate(node => Number(getComputedStyle(node).opacity))).toBeGreaterThan(.7);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '认识下一位' }).press('Enter');
  await expect(dialog.getByRole('heading', { level: 3 })).toHaveText(members[1].name);
  await expect(stage).toHaveAttribute('data-selected', members[1].id);
  await expect(stage).toHaveAttribute('data-phase', phase!);
  if (page.viewportSize()!.width >= 1024) {
    const selected = await page.locator('.member-bubble[data-selected]').boundingBox();
    const card = await dialog.boundingBox();
    expect(card!.x + card!.width < selected!.x || selected!.x + selected!.width < card!.x).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await page.mouse.move(0, 0);
  await expect(stage).toHaveAttribute('data-running', 'true');
  await page.getByRole('button', { name: '暂停星河' }).click();
  await opener.focus(); await opener.press('Enter');
  const manualPhase = await stage.getAttribute('data-phase');
  await dialog.getByRole('button', { name: '认识下一位' }).click();
  await dialog.getByRole('button', { name: '关闭名片' }).click();
  await expect(page.getByRole('button', { name: '恢复星河' })).toHaveAttribute('aria-pressed', 'true');
  await expect(stage).toHaveAttribute('data-phase', manualPhase!);
  await expect(stage).toHaveAttribute('data-pause-reason', 'manual');
  await page.getByRole('button', { name: '恢复星河' }).click();
  await enterOrbit(page);
  await expect(stage).toHaveAttribute('data-running', 'true');
});

test('鼠标移入和真实触屏点按均能选中流动中的星球', async ({ page }, testInfo) => {
  await page.goto('/#team');
  const stage = await enterOrbit(page);
  await expect(stage).toHaveAttribute('data-running', 'true');
  const target = page.locator('.member-bubble').first();
  const rect = (await target.boundingBox())!;
  if (testInfo.project.name === 'mobile') {
    // 真实触屏直接点按移动中的圆心，不让自动化的“等待元素静止”代替触摸行为。
    await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
  } else {
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await expect(stage).toHaveAttribute('data-pause-reason', 'hover');
    await target.click();
  }
  await expect(stage).toHaveAttribute('data-pause-reason', 'selected');
  await expect(page.getByRole('dialog').getByRole('heading', { level: 3 })).toHaveText(members[0].name);
  await page.getByRole('button', { name: '关闭名片' }).click();
});

test('全部31位均能从全局搜索找到并实际打开，单人保持中心稳定', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#team');
  for (const member of members) {
    await page.getByRole('searchbox').fill(member.name);
    const button = page.getByRole('button', { name: `查看${member.name}的名片`, exact: true });
    await button.click();
    await expect(page.getByRole('dialog').getByRole('heading', { level: 3 })).toHaveText(member.name);
    await page.keyboard.press('Escape'); await expect(button).toBeFocused();
  }
  await page.getByRole('searchbox').fill('拼音');
  const stage = page.locator('.orbit-stage');
  await expect(page.locator('.member-bubble')).toHaveCount(1);
  const centre = await page.locator('.member-bubble').evaluate(node => { const a = node.getBoundingClientRect(), b = node.closest('.orbit-stage')!.getBoundingClientRect(); return Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2); });
  expect(centre).toBeLessThan(1);
  await expect(stage).toHaveAttribute('data-running', 'false');
});

test('手机下一位跨批、关闭返回原批，键盘Tab能冻结当前轨道', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#team');
  await page.getByRole('button', { name: '下一批', exact: true }).click();
  await expect(page.locator('.bubble-name')).toHaveText(members.slice(8, 16).map(member => member.name));
  const target = page.getByRole('button', { name: `查看${members[15].name}的名片`, exact: true });
  if (testInfo.project.name === 'mobile') await target.tap(); else await target.click();
  await page.getByRole('button', { name: '认识下一位' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { level: 3 })).toHaveText(members[16].name);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: `查看${members[15].name}的名片`, exact: true })).toBeFocused();
  await expect(page.locator('.bubble-name')).toHaveText(members.slice(8, 16).map(member => member.name));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.member-bubble').first().focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.orbit-stage')).toHaveAttribute('data-pause-reason', 'keyboard');
});

test('离开成员区及页面隐藏时停转，返回后从原相位继续', async ({ page }) => {
  await page.goto('/#team');
  const stage = await enterOrbit(page);
  await expect(stage).toHaveAttribute('data-running', 'true');
  await page.getByRole('navigation').getByRole('link', { name: '产品展厅', exact: true }).click();
  await expect(stage).toHaveAttribute('data-pause-reason', 'offscreen');
  const phase = await stage.getAttribute('data-phase');
  await page.waitForTimeout(200);
  await expect(stage).toHaveAttribute('data-phase', phase!);
  await enterOrbit(page); await expect(stage).toHaveAttribute('data-running', 'true');
  // 控制visibilitychange分支，不依赖测试宿主如何实现后台标签节流。
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(stage).toHaveAttribute('data-pause-reason', 'hidden');
  const hiddenPhase = await stage.getAttribute('data-phase');
  await page.waitForTimeout(180); await expect(stage).toHaveAttribute('data-phase', hiddenPhase!);
  await page.evaluate(() => { delete (document as unknown as { hidden?: boolean }).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await expect(stage).toHaveAttribute('data-running', 'true');
});

test('文字滚动位移有限，可暂停，减少动画时复位且完整可读', async ({ page }) => {
  await page.goto('/');
  const title = page.locator('#home-heading');
  const start = await title.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m42);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => title.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m42)).not.toBe(start);
  const moved = await title.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m42);
  expect(Math.abs(moved)).toBeLessThanOrEqual(12.1);
  await page.locator('#home').getByRole('button', { name: '暂停环境动效' }).click();
  expect(await title.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m42)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.stardust canvas')).toHaveCount(0);
  expect(await title.evaluate(node => getComputedStyle(node).opacity)).toBe('1');
  await expect(title).toContainText('最正经的1组');
});

test('星尘鼠标响应、暂停、透明点击层与触屏静态降级', async ({ page }, testInfo) => {
  await page.goto('/');
  const dust = page.locator('.stardust-hero');
  if (testInfo.project.name === 'mobile') {
    await expect(dust).toHaveAttribute('data-renderer', 'static');
    await expect(dust.locator('canvas')).toHaveCount(0);
    await expect(dust.locator('.static-stars span')).toHaveCount(20);
  } else {
    await expect(dust).toHaveAttribute('data-renderer', 'webgl');
    const canvas = dust.locator('canvas');
    const rect = await dust.boundingBox();
    await page.mouse.move(rect!.x + rect!.width * .75, rect!.y + 250);
    await expect.poll(async () => Number(await canvas.getAttribute('data-pointer'))).toBeGreaterThan(.4);
    await page.mouse.move(0, 0);
    await expect.poll(async () => Number(await canvas.getAttribute('data-pointer'))).toBeLessThan(.02);
    await page.locator('#home').getByRole('button', { name: '暂停环境动效' }).click();
    await expect(canvas).toHaveAttribute('data-running', 'false');
    const frames = await canvas.getAttribute('data-frames'); await page.waitForTimeout(180);
    await expect(canvas).toHaveAttribute('data-frames', frames!);
    await page.locator('#home').getByRole('button', { name: '恢复环境动效' }).click();
    await expect(canvas).toHaveAttribute('data-running', 'true');
  }
  expect(await dust.evaluate(node => getComputedStyle(node).pointerEvents)).toBe('none');
  await page.getByRole('link', { name: '进入工作室', exact: true }).click();
  await expect(page).toHaveURL(/#team$/);
});

test('WebGL不支持与低性能配置均保留静态背景和可用成员', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind: string, ...args: unknown[]) { return kind === 'webgl2' ? null : original.apply(this, [kind, ...args] as never); } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('.stardust-hero')).toHaveAttribute('data-renderer', 'static');
  await expect(page.locator('.stardust canvas')).toHaveCount(0);
  await page.getByRole('searchbox').fill('拼音');
  await page.getByRole('button', { name: '查看拼音的名片', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('低资源设备直接使用静态星点，成员交互仍完整', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 2 }));
  await page.goto('/');
  await expect(page.locator('.stardust canvas')).toHaveCount(0);
  await expect(page.locator('.stardust-hero')).toHaveAttribute('data-renderer', 'static');
  await page.getByRole('searchbox').fill('拼音');
  await page.getByRole('button', { name: '查看拼音的名片', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { level: 3 })).toHaveText('拼音');
});

test('45人运动中无碰撞、无每帧React提交，并记录帧率与内存', async ({ page }, testInfo) => {
  await page.goto('/tests/fixtures/capacity.html');
  const stage = await enterOrbit(page);
  await expect(stage).toHaveAttribute('data-running', 'true');
  const samples = await page.evaluate(async () => {
    const before = (window as Window & { wallRenders?: number }).wallRenders ?? 0;
    const intervals: number[] = []; let last = performance.now(); let overlap = 0;
    for (let frame = 0; frame < 100; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const now = performance.now(); intervals.push(now - last); last = now;
      const rects = [...document.querySelectorAll('.member-bubble')].map(node => node.getBoundingClientRect());
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        overlap = Math.max(overlap, (a.width + b.width) / 2 - Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2));
      }
    }
    intervals.sort((a, b) => a - b);
    return { reactCommitsDuringFrames: ((window as Window & { wallRenders?: number }).wallRenders ?? 0) - before, averageFps: 100000 / intervals.reduce((a, b) => a + b, 0), p95FrameMs: intervals[95], maxOverlapPx: overlap };
  });
  expect(samples.reactCommitsDuringFrames).toBeLessThanOrEqual(1);
  expect(samples.maxOverlapPx).toBeLessThan(1);
  await expectNoOverlap(page);
  const cdp = await page.context().newCDPSession(page);
  const heap = await cdp.send('Runtime.getHeapUsage');
  await writeFile(testInfo.outputPath('performance.json'), JSON.stringify({ project: testInfo.project.name, ...samples, jsHeapUsedBytes: heap.usedSize }, null, 2));
  await cdp.detach();
});

test('StrictMode反复卸载后无站点GSAP动画或ScrollTrigger残留', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const counts = { resize: 0, intersection: 0 };
    const graphics: Record<string, Set<unknown>> = {};
    Object.assign(window, { motionResourceCounts: counts, motionGraphics: graphics });
    for (const [name, key] of [['ResizeObserver', 'resize'], ['IntersectionObserver', 'intersection']]) {
      const Base = (window as unknown as Record<string, typeof ResizeObserver>)[name];
      (window as unknown as Record<string, unknown>)[name] = class extends Base {
        active = false;
        observe(...args: Parameters<ResizeObserver['observe']>) { if (!this.active) { this.active = true; counts[key as keyof typeof counts]++; } return super.observe(...args); }
        disconnect() { if (this.active) { this.active = false; counts[key as keyof typeof counts]--; } super.disconnect(); }
      };
    }
    if (window.WebGL2RenderingContext) for (const kind of ['Program', 'Buffer', 'Shader', 'VertexArray']) {
      const live = graphics[kind] = new Set();
      const proto = WebGL2RenderingContext.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
      const create = proto[`create${kind}`], remove = proto[`delete${kind}`];
      proto[`create${kind}`] = function (...args) { const value = create.apply(this, args); if (value) live.add(value); return value; };
      proto[`delete${kind}`] = function (value) { live.delete(value); return remove.call(this, value); };
    }
  });
  await page.goto('/tests/fixtures/lifecycle.html');
  const cdp = await page.context().newCDPSession(page);
  let firstHeap = 0;
  for (let cycle = 0; cycle < 5; cycle++) {
    await expect(page.locator('.orbit-stage')).toHaveCount(1);
    await page.getByRole('button', { name: '卸载测试页面', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect.poll(() => page.evaluate(async () => {
      const { gsap, ScrollTrigger } = await import('/src/components/motion/gsap.ts');
      return { triggers: ScrollTrigger.getAll().length, ownedAnimations: gsap.globalTimeline.getChildren(true, true, true).filter((item: { vars: { id?: string } }) => /^(member-orbit|parallax-)/.test(item.vars.id ?? '')).length };
    })).toEqual({ triggers: 0, ownedAnimations: 0 });
    expect(await page.evaluate(() => {
      const state = window as Window & { motionResourceCounts: Record<string, number>; motionGraphics: Record<string, Set<unknown>> };
      return Object.values(state.motionResourceCounts).every(value => value === 0) && Object.values(state.motionGraphics).every(set => set.size === 0);
    })).toBe(true);
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    if (!cycle) firstHeap = heap.usedSize;
    if (cycle === 4) {
      const delta = heap.usedSize - firstHeap;
      expect(delta).toBeLessThan(8 * 1024 * 1024);
      await writeFile(testInfo.outputPath('lifecycle-memory.json'), JSON.stringify({ project: testInfo.project.name, cycles: 5, afterFirstUnmountBytes: firstHeap, afterLastUnmountBytes: heap.usedSize, retainedDeltaBytes: delta, activeObservers: 0, activeWebGLResources: 0, activeOwnedAnimations: 0 }, null, 2));
    }
    if (cycle < 4) await page.getByRole('button', { name: '挂载测试页面', exact: true }).click();
  }
  await cdp.detach();
});
