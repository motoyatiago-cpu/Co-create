import { useEffect, useState, useSyncExternalStore } from 'react';

export function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

let paused = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useAmbientMotion() {
  const manual = useSyncExternalStore(subscribe, () => paused);
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  return { paused: manual || reduced, reduced, manual, toggle: () => { paused = !paused; listeners.forEach(listener => listener()); } };
}
