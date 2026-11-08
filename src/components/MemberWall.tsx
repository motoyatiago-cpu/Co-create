import { useEffect, useRef, useState } from 'react';
import type { Member } from '../types/member';
import { MemberCard } from './MemberCard';
import { Icon } from './Icon';
import { findMembers, getKeywordOptions } from '../data/memberDiscovery';
import { MemberOrbit, type OrbitHandle } from './orbit/MemberOrbit';

export function MemberWall({ members }: { members: readonly Member[] }) {
  const [query, setQuery] = useState('');
  const [paused, setPaused] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);
  const orbit = useRef<OrbitHandle>(null);
  const opener = useRef<string>('');
  const restoreFrame = useRef(0);
  const [side, setSide] = useState<'left' | 'right'>('right');
  useEffect(() => () => cancelAnimationFrame(restoreFrame.current), []);
  const search = query.trim().toLocaleLowerCase();
  const options = getKeywordOptions(members);
  const visible = findMembers(members, query, keyword);
  const activeFilters = Boolean(search || keyword);
  const selectedIndex = selected ? visible.findIndex(member => member.id === selected.id) : -1;
  // 整段浏览期间维持同一个 dialog 和焦点，关闭时回到最初点击的泡泡。
  const locateCard = (id: string) => {
    const rect = document.querySelector<HTMLButtonElement>(`[data-member-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();
    if (rect) setSide(rect.x + rect.width / 2 > window.innerWidth / 2 ? 'left' : 'right');
  };
  const nextMember = () => {
    if (visible.length > 1) {
      const next = visible[(selectedIndex + 1) % visible.length];
      orbit.current?.showMember(next.id); locateCard(next.id); setSelected(next);
    }
  };
  const clearFilters = () => { setQuery(''); setKeyword(''); };
  const closeCard = () => {
    setSelected(null); orbit.current?.showMember(opener.current);
    restoreFrame.current = requestAnimationFrame(() => orbit.current?.focusMember(opener.current));
  };

  return <div className="wall" data-paused={paused || undefined}>
    <div className="wall-toolbar">
      <div className="discovery-controls"><div className="search-field"><Icon name="search" /><label className="sr-only" htmlFor="member-search">搜索姓名、昵称、介绍或关键词</label><input id="member-search" type="search" placeholder="搜索姓名、昵称、介绍或关键词" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />{query && <button className="icon-button" aria-label="清除搜索" onClick={() => { setQuery(''); document.getElementById('member-search')?.focus(); }}><Icon name="close" /></button>}</div>
      {options.length > 0 && <div className="keyword-select"><label htmlFor="member-keyword">从关键词认识伙伴</label><select id="member-keyword" aria-label="按成员自填关键词探索" value={keyword} onChange={event => setKeyword(event.target.value)}><option value="">全部关键词</option>{options.map(option => <option key={option.keyword} value={option.keyword}>{option.keyword}（{option.count}）</option>)}</select></div>}</div>
      <button className="motion-button" aria-pressed={paused} onClick={() => setPaused(value => !value)}><Icon name={paused ? 'play' : 'pause'} />{paused ? '恢复星河' : '暂停星河'}</button>
    </div>
    <div className="results-row"><p className="result-count" role="status">{activeFilters ? `找到 ${visible.length} 位伙伴${keyword ? ` · 自填关键词：${keyword}` : ''}` : `当前展示 ${members.length} 张${members.length > 0 && members.every(member => member.isExample) ? '示例' : ''}名片`}</p>{activeFilters && <button className="clear-filters" onClick={clearFilters}>清除筛选，返回全部</button>}</div>
    {visible.length ? <MemberOrbit ref={orbit} members={visible} paused={paused} selectedId={selected?.id} onOpen={member => { opener.current = member.id; locateCard(member.id); setSelected(member); }} /> : <div className="empty-state"><p>{members.length ? '暂时没有找到同频的关键词。' : '伙伴的公开资料正在整理中。'}</p>{activeFilters && <button className="text-link" onClick={clearFilters}>清除搜索，看看所有伙伴</button>}</div>}
    <p className="wall-end">{members.some(member => member.isExample) ? '真实伙伴的故事，等大家亲自填写。' : '不同的星光，在这里相遇。'}</p>
    {selected && <MemberCard member={selected} onClose={closeCard} onNext={nextMember} position={selectedIndex + 1} total={visible.length} orbitSide={side} />}
  </div>;
}
