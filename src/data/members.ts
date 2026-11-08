import type { Member } from '../types/member';

// 全部为交互示例，无真实人物映射。用已确认公开的名册替换此数组即可。
// 不按人数固定位置，MemberWall 会自动布局。已用 45 人 fixture 验证容量。
export const members: Member[] = [
  { id: 'sample-01', name: '示例 01', keywords: ['脑洞', '倾听', '共创'], strengths: '示例：把零散想法整理成故事。', learning: '示例：视觉表达与AI工具。', isExample: true, tone: 'lavender' },
  { id: 'sample-02', name: '示例 02', keywords: ['好奇', '观察', '表达'], strengths: '示例：从日常发现有趣的问题。', learning: '示例：创意写作与产品思考。', isExample: true, tone: 'cyan' },
  { id: 'sample-03', name: '示例 03', keywords: ['温暖', '耐心', '联结'], strengths: '示例：让讨论中的每个声音被听见。', learning: '示例：交流引导与团队协作。', isExample: true, tone: 'lavender' },
  { id: 'sample-04', name: '示例 04', keywords: ['创意', '色彩', '细腻'], strengths: '示例：用画面传递抽象感受。', learning: '示例：界面设计与影像叙事。', isExample: true, tone: 'pink' },
  { id: 'sample-05', name: '示例 05', keywords: ['探索', '逻辑', '实践'], strengths: '示例：把想法拆成可尝试的小步骤。', learning: '示例：前端开发与交互原型。', isExample: true, tone: 'cyan' },
  { id: 'sample-06', name: '示例 06', keywords: ['记录', '共鸣', '文字'], strengths: '示例：记录对话里闪光的瞬间。', learning: '示例：故事结构与内容策划。', isExample: true, tone: 'lavender' },
  { id: 'sample-07', name: '示例 07', keywords: ['开放', '想象', '行动'], strengths: '示例：给一个问题寻找多种可能。', learning: '示例：AI应用与快速实验。', isExample: true, tone: 'pink' },
  { id: 'sample-08', name: '示例 08', keywords: ['包容', '同频', '协作'], strengths: '示例：连接不同想法里的共同点。', learning: '示例：创意共创与需求访谈。', isExample: true, tone: 'lavender' },
  { id: 'sample-09', name: '示例 09', keywords: ['灵感', '幽默', '观察'], strengths: '示例：为平常的事找到意外角度。', learning: '示例：短片创作与声音设计。', isExample: true, tone: 'cyan' },
  { id: 'sample-10', name: '示例 10', keywords: ['敏锐', '感受', '回声'], strengths: '示例：把模糊感受说得更具体。', learning: '示例：情绪表达与用户研究。', isExample: true, tone: 'pink' },
  { id: 'sample-11', name: '示例 11', keywords: ['细节', '秩序', '认真'], strengths: '示例：整理信息并建立清晰结构。', learning: '示例：信息设计与项目协作。', isExample: true, tone: 'lavender' },
  { id: 'sample-12', name: '示例 12', keywords: ['自由', '分享', '好奇'], strengths: '示例：用小实验检验一个新点子。', learning: '示例：生成式工具与跨领域交流。', isExample: true, tone: 'pink' },
];
