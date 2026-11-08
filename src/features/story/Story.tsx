import { Icon } from '../../components/Icon';
import './story.css';

const acts = [
  {
    number: '01',
    title: '交换烟火',
    line: '用美食开启一场相遇',
    description: '先认识彼此，再开始想象。热气和一张话题签，让陌生人慢慢找到共同点。',
  },
  {
    number: '02',
    title: '闭门孵化',
    line: '让奇思脑洞肆意生长',
    description: '从生活与工作里的真实小麻烦出发，不急着给答案，先让问题被完整看见。',
  },
  {
    number: '03',
    title: '反复打磨',
    line: '碎片灵感变成完整产品',
    description: '反复追问为谁服务、能帮上什么忙、应该有什么脾气，让想法长出清晰的雏形。',
  },
  {
    number: '04',
    title: '大幕拉开',
    line: '两款情绪人工智能新品登场',
    description: '发布不是终点。回音结与把感受剪成片走上舞台，也开始接住下一轮真实反馈。',
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
