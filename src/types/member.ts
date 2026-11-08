export type MemberTone = 'lavender' | 'pink' | 'cyan';

export interface Member {
  /** 稳定且唯一，不要用数组序号替代真实成员 ID。 */
  id: string;
  name: string;
  keywords: [string, string, string];
  strengths: string;
  learning: string;
  /** 只使用已获公开许可的头像，本地路径推荐放 public/avatars/。 */
  avatarUrl?: string;
  /** 只有本人/团队确认的组织角色才能填写。 */
  role?: { label: string; confirmed: true };
  isExample: boolean;
  tone: MemberTone;
}
