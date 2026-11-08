import { Icon } from '../../components/Icon';
import './story.css';

const acts = [
  {
    number: '01',
    title: '先吃一口',
    line: '从一道想安利的美食开始认识你',
    description: '圆桌会从一面美食墙开始。鸡饭、饺子、肉夹馍、家乡烧烤，每一句「为什么是它」，都让同桌的人先露出一点真实的自己。',
  },
  {
    number: '02',
    title: '敲敲房门',
    line: '在云公寓里记住一个具体的人',
    description: '大家去云公寓串门。抢到《歌剧魅影》现场票的音乐剧大户、落日下的向日葵花海和一群小猫，让认识落到一个具体的人、一件具体的事上。',
  },
  {
    number: '03',
    title: '秘密研发',
    line: '先留脑洞，再讨论，最后投票',
    description: 'A/B 两组进入各自的秘密研发室。先把未经打磨的脑洞投进箱子，再把相近的想法拼起来讨论，最后投票留下最想继续做的方向。',
  },
  {
    number: '04',
    title: '大幕拉开',
    line: '两款情绪人工智能新品登场',
    description: '两组回到同一张长桌，灯亮幕启。比掌声更重要的是台下的每一条反馈：哪一句被听懂了，哪一处还想再暖一点。',
  },
] as const;

export function Story() {
  return <div className="story-timeline">
    <div className="story-timeline__intro">
      <p>一场圆桌会，四个连续发生的片段。我们从同桌吃饭开始，把一闪而过的念头一路送上发布台。</p>
      <span>圆桌会共创记录 / 四幕复盘</span>
    </div>
    <ol className="story-timeline__grid">
      {acts.map(act => <li key={act.number} className="story-act">
        <div className="story-act__top">
          <span className="story-act__number">{act.number}</span>
          <span className="story-act__dot" aria-hidden="true" />
        </div>
        <h3>{act.title}</h3>
        <p className="story-act__line">{act.line}</p>
        <p className="story-act__description">{act.description}</p>
      </li>)}
    </ol>
    <div className="story-timeline__footer">
      <p>我们不只是做产品，我们在做倾听感受的载体。</p>
      <a
        className="story-timeline__link"
        href="./experiences/story/index.html"
        target="_blank"
        rel="noreferrer"
        aria-label="打开完整四格时间线互动体验（新标签页）"
      >
        进入完整四格时间线
        <Icon name="arrow" />
      </a>
    </div>
  </div>;
}
