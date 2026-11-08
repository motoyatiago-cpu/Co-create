import type { Member } from '../types/member';

// 分类完全来自成员自填关键词，逐字匹配，不从简介推断能力或交流意愿。
export function getKeywordOptions(members: readonly Member[]) {
  const counts = new Map<string, number>();
  for (const member of members) {
    if (member.isExample) continue;
    for (const keyword of new Set(member.keywords.map(value => value.trim()).filter(Boolean))) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'zh-CN'));
}

export function findMembers(members: readonly Member[], query: string, keyword: string) {
  const search = query.trim().toLocaleLowerCase();
  return members.filter(member => {
    const text = [member.name, member.nickname, member.intro, ...member.keywords, member.strengths, member.learning, member.role?.label].filter(Boolean).join(' ').toLocaleLowerCase();
    return (!search || text.includes(search)) && (!keyword || member.keywords.some(value => value.trim() === keyword));
  });
}
