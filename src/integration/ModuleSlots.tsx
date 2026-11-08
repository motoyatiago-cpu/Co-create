import { Products } from '../features/products/Products';
import { Story } from '../features/story/Story';

export function ModuleSlots() {
  return <div className="module-slots container">
    <section id="products" className="module-slot chapter-card" data-chapter="2" aria-labelledby="products-heading">
      <p className="section-index">03 / 产品展厅</p>
      <div className="slot-content">
        <h2 id="products-heading">两款情绪人工智能概念原型</h2>
        <Products />
      </div>
    </section>

    <section id="story" className="module-slot chapter-card" data-chapter="3" aria-labelledby="story-heading">
      <p className="section-index">04 / 共创故事</p>
      <div className="slot-content">
        <h2 id="story-heading">一个人的灵感，怎样变成一群人的回声？</h2>
        <Story />
      </div>
    </section>

    <section id="contact" className="module-slot chapter-card" data-chapter="4" aria-labelledby="contact-heading">
      <p className="section-index">05 / 联系我们</p>
      <div className="slot-content">
        <h2 id="contact-heading">下一次脑洞，期待和你一起。</h2>
        <p>合作邀请与公开联系渠道 · 待团队确认</p>
      </div>
    </section>
  </div>;
}
