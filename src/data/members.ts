import type { Member } from '../types/member';

// 名册来自飞书《1组正式组员情况》·「参会情况」工作表（2026-11-08 只读快照）。
// 联系方式与电话未入库：名册未标注可公开，页面只展示本人填写的姓名、昵称、介绍与关键词。
// 卡通形象为团队统一视觉，不是真实照片；换人只需改 avatarUrl。
const avatars = (index: number) => `/team/avatars/${String(index).padStart(2, '0')}.png`;

export const members: Member[] = [
  { id: 'member-01', name: '臧文琪', nickname: '文琪', bio: '齐齐哈尔大学大一学生，狮子座，INTJ，很开心和大家在这里相遇。', keywords: ['开朗'], avatarUrl: avatars(1), isExample: false, tone: 'pink' },
  { id: 'member-02', name: '陶露露', nickname: '莫惜春衣坐绿苔', bio: '淡淡的就会顺顺的（其实应该是没招了）。', keywords: ['折中', '淡人'], avatarUrl: avatars(2), isExample: false, tone: 'lavender' },
  { id: 'member-03', name: '卢露萌', nickname: '噜噜 / Lumen', bio: '看得见旁人藏住的情绪，洒脱有主见，温柔亦有引领的力量。', keywords: ['敏锐共情', '有主见', '外柔内刚'], avatarUrl: avatars(3), isExample: false, tone: 'cyan' },
  { id: 'member-04', name: '许香怡', nickname: 'kk', bio: '性格稳定、肯干实事，善于倾听，也愿意表达。', keywords: ['靠谱'], avatarUrl: avatars(4), isExample: false, tone: 'pink' },
  { id: 'member-05', name: '刘艺莹', bio: '我这个人不太挑活，交给我了就一定做完。', keywords: [], avatarUrl: avatars(5), isExample: false, tone: 'lavender' },
  { id: 'member-06', name: '穆耶赛尔', bio: '有点像“小蝴蝶型人格”，喜欢探索各种事情，好奇心强，也爱听邓紫棋。', keywords: ['好奇', '探索'], avatarUrl: avatars(6), isExample: false, tone: 'cyan' },
  { id: 'member-07', name: '姜羴', nickname: '三羊', bio: '东北的 I 人，不爱多说，但习惯把日子里的感受悄悄记下来。', keywords: ['稳', '靠谱', '冷静'], avatarUrl: avatars(7), isExample: false, tone: 'pink' },
  { id: 'member-08', name: '冯丽娜', nickname: 'Celia', bio: '脑洞永远比时间多，正在努力让想象成为可以运行的世界。', keywords: ['游戏设计', '叙事创作', 'AI 实验'], avatarUrl: avatars(8), isExample: false, tone: 'lavender' },
  { id: 'member-09', name: '李佩员', nickname: '佩员', bio: 'ENTP，行动派与细节控的组合，喜欢摄影、旅游和小猫咪。', keywords: ['爱猫', '行动派'], avatarUrl: avatars(9), isExample: false, tone: 'cyan' },
  { id: 'member-10', name: '于幸繁', nickname: 'Struggle.呆yu', bio: '始终相信努力会改变命运，Never give up。', keywords: ['死磕到底', '坚持'], avatarUrl: avatars(10), isExample: false, tone: 'pink' },
  { id: 'member-11', name: '周雨涵', nickname: '麦旋风', bio: '喜欢折腾，而且折腾出来的东西能用。', keywords: ['天马行空', '执行力', '生命力'], avatarUrl: avatars(11), isExample: false, tone: 'lavender' },
  { id: 'member-12', name: '钱韵秋', nickname: '线球', bio: '一个不务正业、热爱生活的人类。', keywords: ['温和', '多彩', '责任感'], avatarUrl: avatars(12), isExample: false, tone: 'cyan' },
  { id: 'member-13', name: '邹昀彤', nickname: '壹玖', bio: '新闻学在读的创意型选手，会策划、会写稿，还自带一个舆情雷达。', keywords: ['创意雷达', '舆情雷达', '省电模式'], avatarUrl: avatars(13), isExample: false, tone: 'pink' },
  { id: 'member-14', name: '巩少菲', nickname: '菲菲', bio: '世界这么大，我想去看看。', keywords: ['探索欲'], avatarUrl: avatars(14), isExample: false, tone: 'lavender' },
  { id: 'member-15', name: '张书汇', nickname: '金雀', bio: '西安人，在广州上学第八年，喜欢在小红书记录美食，探索广府与西安的好味道。', keywords: ['美食记录', '北方视角', '西安攻略'], avatarUrl: avatars(15), isExample: false, tone: 'cyan' },
  { id: 'member-16', name: '陈佳', bio: '想安静地观察、阅读和思考。', keywords: ['自我观察员'], avatarUrl: avatars(16), isExample: false, tone: 'pink' },
  { id: 'member-17', name: '周缇', nickname: '呆呆鹅', bio: '一只 ISFJ 的呆鹅。', keywords: ['理性'], avatarUrl: avatars(17), isExample: false, tone: 'lavender' },
  { id: 'member-18', name: '焦婷婷', nickname: '森岛屿夏', bio: '喜欢体验新事物。', keywords: ['体验'], avatarUrl: avatars(18), isExample: false, tone: 'cyan' },
  { id: 'member-19', name: '霍俊文', nickname: 'Cata（嘎达女士）', bio: '一个温暖真诚又爱疯的 ENFJ。', keywords: ['热忱', '真诚', '开朗'], avatarUrl: avatars(19), isExample: false, tone: 'pink' },
  { id: 'member-20', name: '刘颖洁', nickname: 'Favour', bio: '性格活泼。', keywords: ['开朗'], avatarUrl: avatars(20), isExample: false, tone: 'lavender' },
  { id: 'member-21', name: '刘昱彤', nickname: 'Briar', bio: '大二，喜欢捣鼓 AI 创造价值，也喜欢玩蛋仔派对。', keywords: ['爱探索', '想赚钱'], avatarUrl: avatars(21), isExample: false, tone: 'cyan' },
  { id: 'member-22', name: '薛雨诺', nickname: '薛薛', bio: '一个可以为爱做 e 的 i 人，乐于尝试一切新鲜事物。', keywords: ['乐于尝试'], avatarUrl: avatars(22), isExample: false, tone: 'pink' },
  { id: 'member-23', name: '王玥帆', nickname: '玙璠', bio: '喜欢探索未知，爱好比较广泛的慢热型。', keywords: ['绘画', '贝斯', '救助站义工'], avatarUrl: avatars(23), isExample: false, tone: 'lavender' },
  { id: 'member-24', name: '张艺晴', nickname: '麓昕', bio: '法英西专业本科生。', keywords: [], isExample: false, tone: 'cyan' },
  { id: 'member-25', name: '杨利', nickname: 'YL', bio: 'AI 赋能历史研究与教育实践的探索者。', keywords: ['规则与反叛'], isExample: false, tone: 'pink' },
  { id: 'member-26', name: '李佳鑫', nickname: '夹心', bio: 'Be myself. 🤓', keywords: ['爱唱歌'], isExample: false, tone: 'lavender' },
  { id: 'member-27', name: '拼音', bio: '一个爱闲逛、爱交友、爱探索的超级 e 人。', keywords: ['多样'], isExample: false, tone: 'cyan' },
  { id: 'member-28', name: '胡洁', nickname: 'Jessica', bio: '保持好奇心。', keywords: ['INFJ'], isExample: false, tone: 'pink' },
  { id: 'member-29', name: '李欣雅', bio: '喜欢用镜头和文字收集世界，想学着用 AI 把脑海里天马行空的想法落地。', keywords: ['兴趣广泛', '细节收藏', 'AI 探索中'], isExample: false, tone: 'lavender' },
  { id: 'member-30', name: '张金诚', nickname: 'JC', bio: '商科在读，喜欢把复杂的事拆清楚，也乐意和大家一起把想法做成东西。', keywords: ['好奇心强', '执行力', '头脑风暴家'], isExample: false, tone: 'cyan' },
  { id: 'member-31', name: '余海燕', bio: '喜欢让事情变好看、让气氛变舒服。', keywords: ['生活艺术家'], isExample: false, tone: 'pink' },
  { id: 'member-32', name: '张延博', nickname: 'lutra', bio: '南京师范大学大一学生，擅长内容策划和沟通推进，喜欢摄影和弹吉他，正在把 AI 用成日常生产力。', keywords: ['ENFP', '内容策划'], isExample: false, tone: 'lavender' },
];
