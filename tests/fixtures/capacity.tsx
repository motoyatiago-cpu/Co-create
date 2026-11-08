import { createRoot } from 'react-dom/client';
import { MemberWall } from '../../src/components/MemberWall';
import type { Member } from '../../src/types/member';
import '../../src/styles/global.css';
import '../../src/styles/team.css';

const members: Member[] = Array.from({ length: 45 }, (_, index) => ({
  id: `capacity-${index + 1}`,
  name: `容量示例 ${index + 1}`,
  keywords: ['测试', '容量', '示例'],
  strengths: '仅用于容量测试',
  learning: '非真实成员，不进入正式页面',
  isExample: true,
  tone: 'lavender',
}));
createRoot(document.getElementById('root')!).render(<MemberWall members={members} />);
