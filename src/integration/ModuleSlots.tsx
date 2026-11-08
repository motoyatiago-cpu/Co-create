// 于幸繁的唯一接入点：替换对应的 placeholder 为自己的独立组件。
// 保留此处 section 的 id/aria-labelledby；子组件不要重复输出同名锚点。
// 建议文件放 src/features/products、story、contact，避免修改 Celia 的组件。
const slots = [
  { id: 'products', number: '03', title: '产品展厅', subtitle: '两款脑洞，即将登场。', note: '虚构AI概念产品展厅 · 内容整合中' },
  { id: 'story', number: '04', title: '共创故事', subtitle: '一个人的灵感，怎样变成一群人的回声？', note: '圆桌会共创记录 · 内容整合中' },
  { id: 'contact', number: '05', title: '联系我们', subtitle: '下一次脑洞，期待和你一起。', note: '合作邀请与公开联系渠道 · 待团队确认' },
] as const;

export function ModuleSlots() {
  return <div className="module-slots container">{slots.map(slot => <section key={slot.id} id={slot.id} className="module-slot" aria-labelledby={`${slot.id}-heading`}>
    <p className="section-index">{slot.number} / {slot.title}</p>
    <div className="slot-content"><h2 id={`${slot.id}-heading`}>{slot.subtitle}</h2><p>{slot.note}</p></div>
  </section>)}</div>;
}
