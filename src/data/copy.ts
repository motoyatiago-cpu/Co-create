// 工作室名和口号均为候选文案；只在这里更换，不需要改组件。
export const copy = {
  studioName: '第1组工作室',
  identity: '北辰青年第四期 · 第1组',
  titleLines: ['最正经的1组，', '收留最不靠谱的', '脑洞。'],
  subtitle: '真正存在的是我们，产品嘛，先别问。',
  description: '一群真实的人，两款虚构的AI概念产品。',
  draftNote: '工作室名称与口号暂定',
  enterLabel: '进入工作室',
  enterHint: '从这里，认识一起共创的伙伴。',
  productsLabel: '看看我们的脑洞',
  alternativeSlogan: '让每一个脑洞，都能找到回声。',
  team: {
    title: ['不是所有脑洞，', '都需要立刻靠谱。'],
    description: '我们是北辰青年第四期AI线上实习第1组。11月7日，一场《根本没有这样的AI产品发布会》，让日常烦恼变成共同的脑洞。接下来，认识接住这些想法的人。',
    keywords: ['脑洞', '创意', '温暖', '包容', '细腻', '同频', '回声', '群策群力'],
    wallTitle: '在这里，找到你的同频。',
    wallHint: '选择星河轨道或立体名片，认识一位伙伴。',
    exampleNotice: '完整成员资料整理中，以下均为交互示例，非真实成员。',
  },
} as const;

export const navigation = [
  { id: 'home', label: '首页' },
  { id: 'team', label: '团队成员' },
  { id: 'products', label: '产品展厅' },
  { id: 'story', label: '共创故事' },
  { id: 'contact', label: '联系我们' },
] as const;
