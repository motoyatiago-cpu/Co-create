import { useMemo, useRef, useState } from 'react';
import type { Member } from '../types/member';
import { MemberCard } from './MemberCard';
import { MemberGallery } from './MemberGallery';
import { Icon } from './Icon';

export function MemberWall({ members }: { members: readonly Member[] }) {
  const [query, setQuery] = useState('');
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const search = query.trim().toLocaleLowerCase();
  const visible = useMemo(() => members.filter(member => [member.name, member.nickname ?? '', ...member.keywords, member.strengths, member.learning, member.role?.label ?? ''].join(' ').toLocaleLowerCase().includes(search)), [members, search]);
  const closeCard = () => { setSelected(null); requestAnimationFrame(() => opener.current?.focus()); };

  return <div className="wall" data-paused={paused || undefined}>
    <div className="wall-toolbar">
      <div className="search-field"><Icon name="search" /><label className="sr-only" htmlFor="member-search">搜索昵称、关键词或技能</label><input id="member-search" type="search" placeholder="搜索昵称、关键词或技能" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />{query && <button className="icon-button" aria-label="清除搜索" onClick={() => { setQuery(''); document.getElementById('member-search')?.focus(); }}><Icon name="close" /></button>}</div>
      <button className="motion-button" aria-pressed={paused} onClick={() => setPaused(value => !value)}><Icon name={paused ? 'play' : 'pause'} />{paused ? '恢复漂浮' : '暂停漂浮'}</button>
    </div>
    <p className="result-count" role="status">{search ? `找到 ${visible.length} 张名片` : `当前展示 ${members.length} 张${members.every(member => member.isExample) ? '示例' : ''}名片`}</p>
    {visible.length
      ? <MemberGallery members={members} visible={visible} paused={paused} onOpen={(member, trigger) => { opener.current = trigger; setSelected(member); }} />
      : <div className="empty-state"><p>暂时没有找到同频的关键词。</p><button className="text-link" onClick={() => setQuery('')}>清除搜索，看看所有伙伴</button></div>}
    <p className="wall-end">{members.some(member => member.isExample) ? '真实伙伴的故事，等大家亲自填写。' : '不同的星光，在这里相遇。'}</p>
    {selected && <MemberCard key={selected.id} member={selected} onClose={closeCard} />}
  </div>;
}
