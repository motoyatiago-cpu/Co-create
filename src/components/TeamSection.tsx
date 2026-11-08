import { copy } from '../data/copy';
import { members } from '../data/members';
import { MemberWall } from './MemberWall';

export function TeamSection() {
  const hasExamples = members.some(member => member.isExample);
  const notice = hasExamples
    ? members.every(member => member.isExample) ? copy.team.exampleNotice : '标注“示例资料”的名片仅用于演示，其余为成员资料。'
    : members.length ? '认识伙伴，从一张名片开始。' : '完整成员资料整理中。';
  return <section id="team" className="team-section section-pad" aria-labelledby="team-heading"><div className="container">
    <p className="section-index">02 / 团队成员</p>
    <div className="team-intro"><div><h2 id="team-heading">{copy.team.title.map(line => <span key={line}>{line}</span>)}</h2><p className="team-description">{copy.team.description}</p></div>
      <ul className="team-values" aria-label="成员眼中的第1组">{copy.team.keywords.map(word => <li key={word}>{word}</li>)}</ul>
    </div>
    <div className="wall-heading"><h3>{copy.team.wallTitle}</h3><p>{copy.team.wallHint}</p>{(hasExamples || !members.length) && <p className="example-notice">{notice}</p>}</div>
    <MemberWall members={members} />
  </div></section>;
}
