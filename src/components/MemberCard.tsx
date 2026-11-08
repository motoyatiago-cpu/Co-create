import { useEffect, useRef, useState } from 'react';
import type { Member } from '../types/member';
import { Icon } from './Icon';

export function MemberAvatar({ member, large = false }: { member: Member; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <span className={`member-avatar ${large ? 'large' : ''}`}>
    {member.avatarUrl && !failed ? <img src={member.avatarUrl} alt="" onError={() => setFailed(true)} loading="lazy" /> : <span aria-hidden="true">{member.isExample ? member.id.match(/\d+$/)?.[0] ?? '01' : Array.from(member.name)[0]}</span>}
  </span>;
}

export function MemberCard({ member, onClose }: { member: Member; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node?.showModal();
    return () => { node?.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  return <dialog ref={dialog} className={`member-card tone-${member.tone}`} aria-labelledby="member-card-name" aria-describedby="member-card-status" onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }
  }}>
    <button className="icon-button card-close" onClick={onClose} aria-label="关闭名片" autoFocus><Icon name="close" /></button>
    <p id="member-card-status" className="card-status">{member.isExample ? '示例资料 · 非真实成员' : '认识一位共创伙伴'}</p>
    <MemberAvatar member={member} large />
    <h3 id="member-card-name">{member.name}</h3>
    {member.role?.confirmed && <p className="member-role">{member.role.label}</p>}
    <ul className="keyword-list" aria-label="个人关键词">{member.keywords.map(keyword => <li key={keyword}>{keyword}</li>)}</ul>
    <dl><dt>擅长的事情</dt><dd>{member.strengths}</dd><dt>希望学习或交流</dt><dd>{member.learning}</dd></dl>
    <p className="card-end">每一个脑洞，都值得被接住。</p>
  </dialog>;
}
