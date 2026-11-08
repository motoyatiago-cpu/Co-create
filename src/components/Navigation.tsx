import { copy, navigation } from '../data/copy';

export function Navigation({ active }: { active: string }) {
  return <header className="site-header">
    <div className="header-inner container">
      <a className="brand" href="#home" aria-label={`${copy.studioName}，返回首页`}>{copy.studioName}<span aria-hidden="true" /></a>
      <nav aria-label="主导航">
        {navigation.map(({ id, label }) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{label}</a>)}
      </nav>
    </div>
  </header>;
}
