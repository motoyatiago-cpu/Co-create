import { members } from './members';
import { copy } from './copy';
import { excelMemberContacts, type MemberContact } from './memberContacts';

// Presentation order only: never renumber the source roster or media IDs.
const priorityIds = ['member-08', 'member-01', 'member-10', 'member-16'];
export const presentedMembers = [
  ...priorityIds.map(id => members.find(member => member.id === id)!),
  ...members.filter(member => !priorityIds.includes(member.id)),
];

// Keep the previously approved public emails in addition to Excel contacts.
const contactIds: Readonly<Record<string, string>> = {
  '冯丽娜': 'member-08', '臧文琪': 'member-01', '于幸繁': 'member-10',
  '陈佳': 'member-16', '余海燕': 'member-31', '刘艺莹': 'member-05',
};
const contacts: Record<string, MemberContact[]> = Object.fromEntries(
  members.map(member => [member.id, [...(excelMemberContacts[member.id] ?? [])]]),
);
for (const person of copy.contact.people) {
  const id = contactIds[person.name];
  if (id && !contacts[id].some(contact => contact.value.toLowerCase() === person.email.toLowerCase())) {
    contacts[id].push({ label: '邮箱', value: person.email, href: `mailto:${person.email}` });
  }
}
export const publicMemberContacts: Readonly<Record<string, readonly MemberContact[]>> = contacts;
