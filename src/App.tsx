import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ChapterDeck } from './components/ChapterDeck';
import { Hero } from './components/Hero';
import { Navigation } from './components/Navigation';
import { TeamSection } from './components/TeamSection';
import { ModuleSlots } from './integration/ModuleSlots';
import { copy, navigation } from './data/copy';

const PAGE_IDS = new Set<string>(navigation.map(item => item.id));

function readPage() {
  const id = window.location.hash.slice(1);
  return PAGE_IDS.has(id) ? id : 'home';
}

export default function App() {
  const [page, setPage] = useState(readPage);

  const navigate = useCallback((id: string) => {
    if (!PAGE_IDS.has(id)) return;
    setPage(id);
    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [page]);

  useEffect(() => {
    const sync = () => setPage(readPage());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute('href')?.slice(1);
      if (!id || !PAGE_IDS.has(id)) return;
      event.preventDefault();
      navigate(id);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);

  return <>
    <a className="skip-link" href="#team">跳到团队成员</a>
    <Navigation active={page} />
    <main><ChapterDeck active={page}><Hero /><TeamSection /><ModuleSlots /></ChapterDeck></main>
    <footer className="site-footer container"><p>{copy.studioName}<span>北辰青年第四期AI线上实习 · 集体共创作业</span></p><a className="text-link" href="#home">回到首页</a></footer>
  </>;
}
