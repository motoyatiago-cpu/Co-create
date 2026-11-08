import { Hero } from './components/Hero';
import { Navigation } from './components/Navigation';
import { TeamSection } from './components/TeamSection';
import { ModuleSlots } from './integration/ModuleSlots';
import { copy } from './data/copy';

export default function App() {
  return <>
    <a className="skip-link" href="#team">跳到团队成员</a>
    <Navigation />
    <main><Hero /><TeamSection /><ModuleSlots /></main>
    <footer className="site-footer container"><p>{copy.studioName}<span>北辰青年第四期AI线上实习 · 集体共创作业</span></p><a className="text-link" href="#home">回到首页</a></footer>
  </>;
}
