import { useEffect, useState } from 'react';
import { copy, navigation } from '../data/copy';

export function Navigation() {
  const [active, setActive] = useState('home');

  useEffect(() => {
    // 深链接首次打开时，锚点可能先于React内容出现；挂载后再定位一次。
    const id = window.location.hash.slice(1);
    const frame = requestAnimationFrame(() => {
      if (navigation.some(item => item.id === id)) {
        document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    });
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-15% 0px -55% 0px' });
    navigation.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  return <header className="site-header">
    <div className="header-inner container">
      <a className="brand" href="#home" aria-label={`${copy.studioName}，返回首页`}>{copy.studioName}<span aria-hidden="true" /></a>
      <nav aria-label="主导航">
        {navigation.map(({ id, label }) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}>{label}</a>)}
      </nav>
    </div>
  </header>;
}
