import type { Member } from '../types/member';
// 伙伴提供的统一卡通形象，非真人照片；不改写成员原文。
const names = ['臧文琪', '陶露露', '卢露萌', '许香怡', '刘艺莹', '穆耶赛尔', '姜羴', '冯丽娜', '李佩员', '于幸繁', '周雨涵', '钱韵秋', '邹昀彤', '巩少菲', '张书汇', '陈佳', '周缇', '焦婷婷', '霍俊文', '刘颖洁', '刘昱彤', '薛雨诺', '王玥帆'];
export function withPortrait(member: Member): Member {
  const index = names.indexOf(member.name);
  return member.avatarUrl || member.isExample || index < 0 ? member : { ...member, avatarUrl: `${import.meta.env.BASE_URL}team/avatars/${String(index + 1).padStart(2, '0')}.png` };
}
