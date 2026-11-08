import { createRoot } from 'react-dom/client';
import { MemberWall } from '../../src/components/MemberWall';
import type { Member } from '../../src/types/member';
import '../../src/styles/global.css';
import '../../src/styles/team.css';

const members: Member[] = Array.from({ length: 45 }, (_, index) => ({
  id: `capacity-${index + 1}`,
  name: `容量示例 ${index + 1}`,
  nickname: index === 3 ? '测试昵称' : undefined,
  intro: index === 1 ? '仅用于测试的长介绍。\n'.repeat(45) : undefined,
  keywords: index % 3 === 0 ? [] : index % 3 === 1 ? ['测试创意'] : ['测试视觉', '测试技术', '测试共创', '测试倾听', '测试文字', '这是一条用于检查小屏换行的很长很长的测试关键词'],
  strengths: index === 1 ? '测试：可以分享的内容' : undefined,
  learning: index === 1 ? '测试：希望交流的内容' : undefined,
  isExample: false,
  tone: 'lavender',
}));
createRoot(document.getElementById('root')!).render(<MemberWall members={members} />);
