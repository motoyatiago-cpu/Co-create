// 工作室名和口号均为候选文案；只在这里更换，不需要改组件。
export const copy = {
  studioName: '第1组工作室',
  identity: '北辰青年第四期 · 第1组',
  titleLines: ['最正经的 1 组，', '收留最“不靠谱”的', '脑洞。'],
  subtitle: '真正存在的是我们，产品嘛，先别问。',
  description: '一群真实的人，两款虚构的AI概念产品。',
  enterLabel: '进入工作室',
  productsLabel: '看看我们的脑洞',
  alternativeSlogan: '让每一个脑洞，都能找到回声。',
  team: {
    title: ['不是所有脑洞，', '都需要立刻靠谱。'],
    description: '我们是北辰青年第四期AI线上实习第1组。2026年11月7日，一场《根本没有这样的AI产品发布会》把我们聚在一起。从日常烦恼出发，在两间临时研发室里，把独立的想法变成共同的脑洞。这里有创意，也有细腻的倾听；有温暖与包容，也有愿意接住彼此的同频。',
    keywords: ['脑洞', '创意', '温暖', '包容', '细腻', '同频', '回声', '群策群力'],
    wallTitle: '在这里，找到你的同频。',
    wallHint: '点击一张立体名片，认识一个有趣的灵魂。',
    exampleNotice: '完整成员资料整理中，以下均为交互示例，非真实成员。',
    avatarNotice: '卡通形象为团队统一视觉，非真实照片。',
  },
  contact: {
    invite: '合作邀请与公开联系渠道 · 欢迎来信',
    people: [
      { name: '冯丽娜', nickname: 'Nivis', email: 'cclia1126@gmail.com' },
      { name: '于幸繁', nickname: 'Struggle.呆', email: 'strggle521yu@163.com' },
      { name: '陈佳', nickname: '阿若', email: 'cuijun202608@163.com' },
      { name: '臧文琪', nickname: '呵', email: '2731161093@qq.com' },
      { name: '余海燕', nickname: '@me', email: 'fercy666@163.com' },
    ],
  },
} as const;

export const navigation = [
  { id: 'home', label: '首页' },
  { id: 'team', label: '团队成员' },
  { id: 'products', label: '产品展厅' },
  { id: 'story', label: '共创故事' },
  { id: 'contact', label: '联系我们' },
] as const;
