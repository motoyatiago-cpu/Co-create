import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import type { Member } from '../../types/member';
import { MemberAvatar } from '../MemberCard';
import { Icon } from '../Icon';
import { gsap, useGSAP } from '../motion/gsap';
import { useMedia } from '../motion/preferences';
import { createGeometry, pathData, separate, targetsAt, type Point } from './orbitGeometry';
import './orbit.css';

export interface OrbitHandle { showMember: (id: string) => void; focusMember: (id: string) => void }
interface Props { members: readonly Member[]; paused: boolean; selectedId?: string; onOpen: (member: Member, button: HTMLButtonElement) => void }

export const MemberOrbit = forwardRef<OrbitHandle, Props>(function MemberOrbit({ members, paused, selectedId, onOpen }, ref) {
  const compact = useMedia('(max-width: 1023px)');
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const [page, setPage] = useState(0);
  const [geometry, setGeometry] = useState(() => createGeometry(1200, 820, 88));
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const cached = useRef(new Map<string, Point>());
  const phase = useRef(.017);
  const keyboard = useRef(false);
  const controller = useRef<(() => void) | null>(null);
  const pageSize = compact ? 8 : members.length || 1;
  const pageCount = Math.max(1, Math.ceil(members.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const displayed = compact ? members.slice(safePage * pageSize, (safePage + 1) * pageSize) : members;
  const key = displayed.map(member => member.id).join('|');
  const filterKey = members.map(member => member.id).join('|');
  const flags = useRef({ paused, selectedId, hovered, keyboardFocus, reduced });
  flags.current = { paused, selectedId, hovered, keyboardFocus, reduced };

  useEffect(() => { setPage(0); setHovered(false); setKeyboardFocus(false); }, [filterKey]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Tab') keyboard.current = true; };
    const pointer = () => { keyboard.current = false; setKeyboardFocus(false); };
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', pointer, { passive: true });
    return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('pointerdown', pointer); };
  }, []);
  useImperativeHandle(ref, () => ({
    showMember(id) { const index = members.findIndex(member => member.id === id); if (compact && index >= 0) setPage(Math.floor(index / pageSize)); },
    focusMember(id) { buttons.current.get(id)?.focus({ preventScroll: true }); },
  }), [members, compact, pageSize]);

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const size = compact ? width < 320 ? 68 : 76 : members.length > 36 ? width < 1100 ? 70 : 72 : members.length > 31 ? width < 1100 ? 76 : 80 : width < 1100 ? 80 : 88;
      setGeometry(createGeometry(Math.max(width, 240), height, size));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact, members.length]);

  useGSAP(() => {
    const node = stage.current;
    if (!node || !displayed.length) return;
    const nodes = displayed.map(member => buttons.current.get(member.id)!);
    const start = performance.now();
    let inView = false, entering = false;
    const state = { phase: phase.current, blend: 1 };
    const initial = targetsAt(geometry, nodes.length, state.phase);
    let positions = separate(initial.map(point => ({ ...point })), geometry, 80);
    const origins = displayed.map((member, index) => cached.current.get(member.id) ?? positions[index]);
    const hasOrigin = displayed.some(member => cached.current.has(member.id));
    if (hasOrigin) positions = separate(origins.map(point => ({ ...point })), geometry);
    const draw = () => {
      const target = targetsAt(geometry, nodes.length, state.phase);
      const destination = state.blend < 1 ? target.map((point, i) => ({ x: origins[i].x + (point.x - origins[i].x) * state.blend, y: origins[i].y + (point.y - origins[i].y) * state.blend })) : target;
      positions = separate(destination, geometry);
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.transform = `translate3d(${positions[i].x - geometry.size / 2}px,${positions[i].y - geometry.size / 2}px,0)`;
        cached.current.set(displayed[i].id, { ...positions[i] });
      }
      phase.current = state.phase;
      node.dataset.phase = state.phase.toFixed(6);
    };
    draw();
    const timeline = gsap.timeline({ id: 'member-orbit-loop', paused: true, repeat: -1 });
    timeline.to(state, { phase: state.phase + 1, duration: 120, ease: 'none', onUpdate: draw });
    const sync = () => {
      const f = flags.current;
      const reason = f.reduced ? 'reduced' : f.paused ? 'manual' : f.selectedId ? 'selected' : f.keyboardFocus ? 'keyboard' : f.hovered ? 'hover' : document.hidden ? 'hidden' : !inView ? 'offscreen' : nodes.length === 1 ? 'single' : '';
      node.dataset.pauseReason = reason;
      const running = !reason && !entering;
      node.dataset.running = String(running);
      if (running) timeline.play(); else timeline.pause();
      if (reason && reason !== 'single') reflow?.pause(); else if (entering) reflow?.resume();
    };
    let reflow: gsap.core.Tween | undefined;
    if (hasOrigin && !reduced && !paused && !selectedId) {
      entering = true; state.blend = 0;
      reflow = gsap.to(state, { id: 'member-orbit-reflow', blend: 1, duration: .6, ease: 'power2.out', onUpdate: draw, onComplete: () => { entering = false; sync(); } });
    }
    // 固定导航覆盖的区域不算可见；只剩一小段轨道时也不持续消耗动画资源。
    const headerHeight = Math.ceil(document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0);
    const intersection = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .15); sync(); }, { threshold: .15, rootMargin: `-${headerHeight}px 0px 0px` });
    intersection.observe(node);
    const visibility = () => { if (document.hidden) reflow?.pause(); else reflow?.resume(); sync(); };
    document.addEventListener('visibilitychange', visibility);
    controller.current = sync;
    sync();
    node.dataset.ready = 'true';
    node.dataset.setupMs = (performance.now() - start).toFixed(2);
    return () => {
      intersection.disconnect(); document.removeEventListener('visibilitychange', visibility);
      timeline.kill(); reflow?.kill(); controller.current = null;
      delete node.dataset.ready; node.dataset.running = 'false';
    };
  }, { scope: stage, dependencies: [key, geometry, reduced], revertOnUpdate: true });

  useEffect(() => { controller.current?.(); }, [paused, selectedId, hovered, keyboardFocus]);

  return <div className="member-galaxy" data-compact={compact || undefined}>
    <p className="orbit-hint">{reduced ? '静态星河 · 点击星球认识伙伴' : compact ? '每批8位伙伴 · 搜索覆盖所有人' : '星河慢慢流动 · 鼠标移入即可暂停'}{selectedId && <span>正在认识伙伴 · 星河已暂停</span>}</p>
    <div ref={stage} className="orbit-stage" data-single={members.length === 1 || undefined} data-dense={members.length > 36 || undefined} data-selected={selectedId || ''} data-reduced={reduced || undefined} style={{ '--planet-size': `${geometry.size}px` } as CSSProperties}
      onKeyDownCapture={event => { if (event.key === 'Tab') keyboard.current = true; }}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onPointerDownCapture={() => { keyboard.current = false; setKeyboardFocus(false); }}
      onFocusCapture={() => { if (keyboard.current) setKeyboardFocus(true); }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false); }}>
      <svg className="orbit-path" viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true"><path d={pathData(geometry)} /><path d={pathData(geometry)} className="orbit-path-secondary" /></svg>
      <ul className="orbit-members" aria-label="无限星河成员轨道">
        {displayed.map(member => <li key={member.id}><button ref={node => { if (node) buttons.current.set(member.id, node); else buttons.current.delete(member.id); }}
          className={`member-bubble orbit-planet tone-${member.tone}`} data-member-id={member.id} data-selected={selectedId === member.id || undefined}
          aria-label={`查看${member.name}的名片${member.isExample ? '，示例资料' : ''}`} aria-haspopup="dialog"
          onClick={event => onOpen(member, event.currentTarget)}>
          <span className="planet-body"><span className="bubble-surface" aria-hidden="true" /><span className="bubble-content"><MemberAvatar member={member} /><span className="bubble-name">{member.name}</span><span className="bubble-caption">{member.keywords[0] || '点击认识'}</span></span><span className="selection-ring" aria-hidden="true" /></span>
        </button></li>)}
      </ul>
    </div>
    {compact && pageCount > 1 && <nav className="orbit-pagination" aria-label="成员分批浏览"><button disabled={safePage === 0} onClick={() => setPage(value => value - 1)}>上一批</button><span aria-live="polite">第 {safePage + 1} / {pageCount} 批 · 共 {members.length} 位</span><button disabled={safePage === pageCount - 1} onClick={() => setPage(value => value + 1)}>下一批</button></nav>}
    <span className="sr-only">成员姓名按资料顺序排列。键盘进入轨道时暂停移动。</span>
    <span className="orbit-mark" aria-hidden="true"><Icon name="star" /></span>
  </div>;
});
