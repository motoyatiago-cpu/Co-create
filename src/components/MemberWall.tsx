import { useRef, useState, type CSSProperties } from 'react';
import type { Member } from '../types/member';
import { MemberAvatar, MemberCard } from './MemberCard';
import { Icon } from './Icon';
import { findMembers, getKeywordOptions } from '../data/memberDiscovery';

export function MemberWall({ members }: { members: readonly Member[] }) {
  const [query, setQuery] = useState('');
  const [paused, setPaused] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const search = query.trim().toLocaleLowerCase();
  const options = getKeywordOptions(members);
  const visible = findMembers(members, query, keyword);
  const activeFilters = Boolean(search || keyword);
  const selectedIndex = selected ? visible.findIndex(member => member.id === selected.id) : -1;
  // 整段浏览期间维持同一个 dialog 和焦点，关闭时回到最初点击的泡泡。
  const nextMember = () => { if (visible.length > 1) setSelected(visible[(selectedIndex + 1) % visible.length]); };
  const clearFilters = () => { setQuery(''); setKeyword(''); };
  const closeCard = () => { setSelected(null); requestAnimationFrame(() => opener.current?.focus()); };

  return <div className="wall" data-paused={paused || undefined}>
    <div className="wall-toolbar">
      <div className="discovery-controls"><div className="search-field"><Icon name="search" /><label className="sr-only" htmlFor="member-search">搜索姓名、昵称、介绍或关键词</label><input id="member-search" type="search" placeholder="搜索姓名、昵称、介绍或关键词" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />{query && <button className="icon-button" aria-label="清除搜索" onClick={() => { setQuery(''); document.getElementById('member-search')?.focus(); }}><Icon name="close" /></button>}</div>
      {options.length > 0 && <div className="keyword-select"><label htmlFor="member-keyword">从关键词认识伙伴</label><select id="member-keyword" aria-label="按成员自填关键词探索" value={keyword} onChange={event => setKeyword(event.target.value)}><option value="">全部关键词</option>{options.map(option => <option key={option.keyword} value={option.keyword}>{option.keyword}（{option.count}）</option>)}</select></div>}</div>
      <button className="motion-button" aria-pressed={paused} onClick={() => setPaused(value => !value)}><Icon name={paused ? 'play' : 'pause'} />{paused ? '恢复漂浮' : '暂停漂浮'}</button>
    </div>
    <div className="results-row"><p className="result-count" role="status">{activeFilters ? `找到 ${visible.length} 位伙伴${keyword ? ` · 自填关键词：${keyword}` : ''}` : `当前展示 ${members.length} 张${members.length > 0 && members.every(member => member.isExample) ? '示例' : ''}名片`}</p>{activeFilters && <button className="clear-filters" onClick={clearFilters}>清除筛选，返回全部</button>}</div>
    {visible.length ? <ul className="bubble-grid" aria-label="成员泡泡墙">
      {visible.map((member, index) => <li key={member.id} style={{ '--float-delay': `${-(index % 7)}s`, '--float-duration': `${5 + index % 4}s` } as CSSProperties}>
        <button className={`member-bubble tone-${member.tone}`} aria-label={`查看${member.name}的名片${member.isExample ? '，示例资料' : ''}`} aria-haspopup="dialog" onClick={event => { opener.current = event.currentTarget; setSelected(member); }}>
          <span className="bubble-surface" aria-hidden="true" /><span className="bubble-content"><MemberAvatar member={member} /><span className="bubble-name">{member.name}</span><span className="bubble-caption">{member.isExample ? '示例资料' : member.keywords[0] || '点击认识'}</span></span>
        </button>
      </li>)}
    </ul> : <div className="empty-state"><p>{members.length ? '暂时没有找到同频的关键词。' : '伙伴的公开资料正在整理中。'}</p>{activeFilters && <button className="text-link" onClick={clearFilters}>清除搜索，看看所有伙伴</button>}</div>}
    <p className="wall-end">{members.some(member => member.isExample) ? '真实伙伴的故事，等大家亲自填写。' : '不同的星光，在这里相遇。'}</p>
    {selected && <MemberCard member={selected} onClose={closeCard} onNext={nextMember} position={selectedIndex + 1} total={visible.length} />}
  </div>;
}
