import { useRef, type RefObject } from 'react';
import { gsap, ScrollTrigger, useGSAP } from './gsap';
import { useAmbientMotion } from './preferences';

export function useParallax(scope: RefObject<HTMLElement | null>) {
  const { paused } = useAmbientMotion();
  const refreshFrame = useRef(0);
  useGSAP(() => {
    const root = scope.current;
    if (!root || paused) return;
    const timeline = gsap.timeline({ id: `parallax-${root.id}`, scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: .7, invalidateOnRefresh: true } });
    root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((element, index) => {
      const depth = Number(element.dataset.parallax) || 16;
      timeline.fromTo(element, { y: -depth / 2 }, { y: depth / 2, duration: 1, ease: 'none' }, index * .035);
    });
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(refreshFrame.current);
      refreshFrame.current = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    resize.observe(root);
    return () => { resize.disconnect(); cancelAnimationFrame(refreshFrame.current); };
  }, { scope, dependencies: [paused], revertOnUpdate: true });
}
