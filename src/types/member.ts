export type MemberTone = 'lavender' | 'pink' | 'cyan';

export interface Member {
  /** 稳定且唯一，不要用数组序号替代真实成员 ID。 */
  id: string;
  name: string;
  nickname?: string;
  /** 名册中的一句话介绍。 */
  bio?: string;
  keywords: string[];
  /** 仅示例名片使用的旧字段。 */
  strengths?: string;
  learning?: string;
  /** 只使用已获公开许可的头像，本地路径推荐放 public/team/avatars/。 */
  avatarUrl?: string;
  /** 仅按已确认资料分配卡通形象，不推断真实外貌。 */
  avatarGender?: 'male' | 'female';
  /** 只有本人/团队确认的组织角色才能填写。 */
  role?: { label: string; confirmed: true };
  isExample: boolean;
  tone: MemberTone;
}
