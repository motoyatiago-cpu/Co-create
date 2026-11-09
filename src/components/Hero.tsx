import { copy } from '../data/copy';
import { Icon } from './Icon';
import { NebulaScene } from './NebulaScene';

export function Hero() {
  return <section id="home" className="hero chapter-card" data-chapter="0" aria-labelledby="home-heading">
    <NebulaScene />
    <div className="container hero-inner">
      <div className="hero-main">
        <div className="hero-copy">
          <p className="identity">{copy.identity}</p>
          <h1 id="home-heading">{copy.titleLines.map((line, i) => <span key={line} className={i === 2 ? 'accent' : undefined}>{line}</span>)}</h1>
          <p className="hero-subtitle">{copy.subtitle}</p>
          <p className="hero-description">{copy.description}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#team">{copy.enterLabel}<Icon name="arrow" /></a>
            <a className="text-link" href="#products">{copy.productsLabel}</a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}art/nebula.webp`} alt="" width="1024" height="1024" fetchPriority="high" /></div>
      </div>
      <div className="hero-foot"><span>01 / 05</span><span className="fine-line" /><p>{copy.alternativeSlogan}</p></div>
    </div>
  </section>;
}
