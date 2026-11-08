import { Icon } from '../../components/Icon';
import './products.css';

const products = [
  {
    id: 'echo-knot',
    name: '回音结',
    label: '深夜情绪解码器',
    description: '把聊天里说不出口的部分慢慢拆开，照见情绪、关系与自己的认知边界，再整理成可以好好说出口的回应。',
    detail: '本地解码 · 断网可用 · 内容留在设备中',
    href: './experiences/echo-knot/index.html',
  },
  {
    id: 'feeling-film',
    name: '把感受剪成片',
    label: '个人情绪影像生成器',
    description: '从一句今天的感受出发，挑画面、定节奏、回答两道问题，把散落的生活片段剪成一段属于自己的短片。',
    detail: '本地素材 · 本地生成 · 支持影片与海报导出',
    href: './experiences/feeling-film/index.html',
  },
] as const;

function ProductVisual({ id }: { id: (typeof products)[number]['id'] }) {
  if (id === 'echo-knot') {
    return <div className="product-card__visual product-card__visual--knot" aria-hidden="true">
      <span className="product-card__halo" />
      <svg viewBox="0 0 260 180">
        <path d="M52 95C31 49 89 27 127 73c37 45 94 23 78-21" />
        <path d="M58 83c21-45 78-28 72 20-6 48 59 56 78 14" />
        <path d="M91 55c-29 37-1 87 43 68 44-19 70 16 52 45" />
      </svg>
      <span className="product-card__echo product-card__echo--one" />
      <span className="product-card__echo product-card__echo--two" />
    </div>;
  }

  return <div className="product-card__visual product-card__visual--film" aria-hidden="true">
    <div className="product-card__film-strip">
      {['迟疑', '微光', '靠近', '松开'].map(word => <span key={word}>{word}</span>)}
    </div>
    <span className="product-card__cut-line" />
  </div>;
}

export function Products() {
  return <div className="products-showcase">
    <p className="products-showcase__note">不是已经上线的商业服务，而是由真实问题长出的两款可体验概念原型。</p>
    <ul className="products-showcase__grid">
      {products.map(product => <li key={product.id}>
        <article className={`product-card product-card--${product.id}`}>
          <ProductVisual id={product.id} />
          <div className="product-card__body">
            <p className="product-card__eyebrow">概念产品 / {product.label}</p>
            <h3>{product.name}</h3>
            <p className="product-card__description">{product.description}</p>
            <p className="product-card__detail">{product.detail}</p>
            <a
              className="product-card__link"
              href={product.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`打开${product.name}完整体验（新标签页）`}
            >
              打开完整体验
              <Icon name="arrow" />
            </a>
          </div>
        </article>
      </li>)}
    </ul>
  </div>;
}
