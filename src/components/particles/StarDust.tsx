import { useCallback, useEffect, useRef, useState } from 'react';
import Particles from './Particles';
import { useAmbientMotion, useMedia } from '../motion/preferences';
import './stardust.css';

const colors = ['#F4E9D4', '#A98CF5', '#7EE0E3', '#F2A9C4'];
export function StarDust({ kind }: { kind: 'hero' | 'team' }) {
  const { paused, reduced } = useAmbientMotion();
  const coarse = useMedia('(pointer: coarse)');
  const [unsupported, setUnsupported] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const limited = (device.hardwareConcurrency || 8) <= 2 || (device.deviceMemory ?? 8) <= 2 || Boolean(device.connection?.saveData);
  const useStatic = reduced || coarse || limited || unsupported;
  const fallback = useCallback(() => { setUnsupported(true); }, []);
  const ready = useCallback(() => { if (root.current) root.current.dataset.renderer = 'webgl'; }, []);
  useEffect(() => { if (root.current && useStatic) root.current.dataset.renderer = 'static'; }, [useStatic]);
  return <div ref={root} className={`stardust stardust-${kind}`} data-renderer="static" data-paused={paused || undefined} aria-hidden="true">
    <div className="static-stars">{Array.from({ length: coarse ? 20 : 44 }, (_, i) => <span key={i} style={{ left: `${(i * 37 + 7) % 97}%`, top: `${(i * 23 + 11) % 95}%`, background: colors[i % colors.length], width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, opacity: .25 + (i % 4) * .1 }} />)}</div>
    {!useStatic && <Particles particleCount={60} speed={.025} particleColors={colors} moveParticlesOnHover particleHoverFactor={.18} particleBaseSize={42} sizeRandomness={.7} disableRotation pixelRatio={1} glow={.025} twinkle={.06} depthOfField={0} connections={false} hoverEffect="repel" hoverRadius={160} clickBurst={false} intro={false} opacity={.55} paused={paused} onReady={ready} onUnsupported={fallback} onSlow={fallback} />}
  </div>;
}

export function AmbientToggle() {
  const { paused, reduced, toggle } = useAmbientMotion();
  return <button className="ambient-toggle" onClick={toggle} disabled={reduced} aria-pressed={paused}>{reduced ? '已跟随系统减少动画' : paused ? '恢复环境动效' : '暂停环境动效'}</button>;
}
