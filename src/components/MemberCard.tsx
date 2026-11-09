import { useEffect, useRef, useState } from 'react';
import type { Member } from '../types/member';
import { Icon } from './Icon';
import { MemberPhotos } from './MemberPhotos';
import { useMemberMedia } from '../hooks/useMemberMedia';
import { publicMemberContacts } from '../data/memberPresentation';

export function MemberAvatar({ member, large = false }: { member: Member; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <span className={`member-avatar ${large ? 'large' : ''}`}>
    {member.avatarUrl && !failed ? <img src={member.avatarUrl} alt="" onError={() => setFailed(true)} loading="lazy" /> : <span aria-hidden="true">{member.isExample ? member.id.match(/\d+$/)?.[0] ?? '01' : Array.from(member.name)[0]}</span>}
  </span>;
}

export function MemberCard({ member, onClose }: { member: Member; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const images = useMemberMedia(member.id);
  const contacts = member.isExample ? [] : publicMemberContacts[member.id] ?? [];
  useEffect(() => {
    const node = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node?.showModal();
    return () => { node?.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  return <dialog ref={dialog} className={`member-card tone-${member.tone}${photoExpanded ? ' with-photo-viewer' : ''}`} aria-labelledby="member-card-name" aria-describedby="member-card-status" onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')).filter(node => node.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); if (photoExpanded) setPhotoExpanded(false); else onClose(); }} onClick={event => {
    if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }
  }}>
    <button className="icon-button card-close" onClick={onClose} aria-label="关闭名片" autoFocus><Icon name="close" /></button>
    <p id="member-card-status" className="card-status">{member.isExample ? '示例资料 · 非真实成员' : '认识一位共创伙伴'}</p>
    <MemberAvatar member={member} large />
    <h3 id="member-card-name">{member.name}</h3>
    {member.nickname && member.nickname !== member.name && <p className="member-nickname">昵称 · {member.nickname}</p>}
    {member.role?.confirmed && <p className="member-role">{member.role.label}</p>}
    {member.keywords.length > 0 && <ul className="keyword-list" aria-label="个人关键词">{member.keywords.map(keyword => <li key={keyword}>{keyword}</li>)}</ul>}
    {member.bio && <p className="member-bio">{member.bio}</p>}
    {(member.strengths || member.learning) && <dl>{member.strengths && <><dt>擅长的事情</dt><dd>{member.strengths}</dd></>}{member.learning && <><dt>希望学习或交流</dt><dd>{member.learning}</dd></>}</dl>}
    {contacts.length > 0 && <div className="member-contact"><h4>和我联系</h4><dl>{contacts.map(contact => <div key={`${contact.label}:${contact.value}`}><dt>{contact.label}</dt><dd>{contact.href ? <a href={contact.href} aria-label={contact.label === '邮箱' ? `发邮件给${member.name}：${contact.value}` : `${contact.label}：${contact.value}`}>{contact.value}</a> : contact.value}</dd></div>)}</dl></div>}
    <MemberPhotos key={member.id} memberId={member.id} images={images} expanded={photoExpanded} onExpand={setPhotoExpanded} />
    {images.length > 0 && <button type="button" className="photo-card-close" onClick={onClose}>收起名片</button>}
    <p className="card-end">每一个脑洞，都值得被接住。</p>
  </dialog>;
}
