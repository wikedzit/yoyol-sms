import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import type { ClubActivity, ClubMember, ClubRecord, ClubsPage } from '../../workers/kernel/clubs';
import source from './yoyol.extension.json';

const clubs = defineModule({
  manifest: source,
  async handlePage(_request, context) {
    const page = await context.clubs?.open();
    if (!page) return view.page('clubs.title', [view.text('clubs.empty')]);
    return homeDocument(page);
  },
  async handleAction(_name, fields, context) {
    return context.clubs?.save(fields) ?? { error: 'Clubs are not available.' };
  },
});

function homeDocument(page: ClubsPage) {
  const openClubs = page.clubs.filter((club) => !club.closed);
  const writable = page.clubs.filter((club) => club.canWrite);
  const body: Record<string, unknown>[] = [
    view.text('clubs.description'),
    {
      type: 'section',
      heading: { t: 'clubs.list' },
      body: page.clubs.length === 0
        ? [view.text('clubs.empty')]
        : page.clubs.flatMap((club) => clubNodes(club, page)),
    },
  ];
  if (page.canManage) {
    body.push(clubForm(page, null));
  }
  body.push({
    type: 'section',
    heading: { t: 'clubs.members' },
    body: page.members.length === 0
      ? [view.text('clubs.membersEmpty')]
      : page.members.flatMap((member) => memberNodes(member, page.canManage)),
  });
  if (page.canManage && openClubs.length > 0 && page.students.length > 0) {
    body.push({
      type: 'form',
      action: 'enrol',
      method: 'post',
      submitLabel: { t: 'clubs.enrol' },
      fields: [
        {
          name: 'clubId',
          kind: 'select',
          label: { t: 'clubs.name' },
          options: openClubs.map((club) => ({ value: String(club.id), label: club.name })),
        },
        {
          name: 'studentId',
          kind: 'select',
          label: { t: 'clubs.student' },
          options: page.students.map((student) => ({ value: String(student.id), label: student.name })),
        },
      ],
    });
  }
  body.push({
    type: 'section',
    heading: { t: 'clubs.activities' },
    body: page.activities.length === 0
      ? [view.text('clubs.activitiesEmpty')]
      : page.activities.flatMap((activity) => activityNodes(activity)),
  });
  if (writable.length > 0) {
    body.push(activityForm(writable));
  }
  return view.page('clubs.title', body);
}

function clubNodes(club: ClubRecord, page: ClubsPage) {
  const nodes: Record<string, unknown>[] = [
    { type: 'text', value: club.line },
    { type: 'text', value: club.description },
  ];
  if (page.canManage && !club.closed) {
    nodes.push(clubForm(page, club));
    nodes.push({
      type: 'button',
      label: { t: 'clubs.close' },
      action: 'close',
      values: { clubId: String(club.id) },
    });
  }
  return nodes;
}

function clubForm(page: ClubsPage, club: ClubRecord | null) {
  return {
    type: 'form',
    action: 'club',
    method: 'post',
    submitLabel: { t: 'clubs.save' },
    fields: [
      ...(club ? [{ name: 'clubId', kind: 'hidden', value: String(club.id) }] : []),
      { name: 'name', kind: 'text', label: { t: 'clubs.name' }, ...(club ? { value: club.name } : {}) },
      { name: 'description', kind: 'text', label: { t: 'clubs.about' }, ...(club ? { value: club.description } : {}) },
      {
        name: 'patronId',
        kind: 'select',
        label: { t: 'clubs.patron' },
        ...(club ? { value: String(club.patronId) } : {}),
        options: page.teachers.map((teacher) => ({ value: String(teacher.id), label: teacher.name })),
      },
    ],
  };
}

function memberNodes(member: ClubMember, canManage: boolean) {
  const nodes: Record<string, unknown>[] = [{ type: 'text', value: member.line }];
  if (canManage) {
    nodes.push({
      type: 'button',
      label: { t: 'clubs.removeMember' },
      action: 'remove-member',
      values: { membershipId: String(member.id) },
    });
  }
  return nodes;
}

function activityNodes(activity: ClubActivity) {
  const nodes: Record<string, unknown>[] = [
    { type: 'text', value: activity.line },
    { type: 'text', value: activity.description },
  ];
  if (!activity.canWrite) return nodes;
  nodes.push({
    type: 'form',
    action: 'activity',
    method: 'post',
    submitLabel: { t: 'clubs.saveActivity' },
    fields: [
      { name: 'activityId', kind: 'hidden', value: String(activity.id) },
      { name: 'clubId', kind: 'hidden', value: String(activity.clubId) },
      { name: 'title', kind: 'text', label: { t: 'clubs.activityTitle' }, value: activity.title },
      { name: 'description', kind: 'text', label: { t: 'clubs.activityBody' }, value: activity.description },
      { name: 'activityDate', kind: 'date', label: { t: 'clubs.date' }, value: activity.activityDate },
    ],
  });
  nodes.push({
    type: 'button',
    label: { t: 'clubs.removeActivity' },
    action: 'remove-activity',
    values: { activityId: String(activity.id) },
  });
  return nodes;
}

function activityForm(clubsToUse: ClubRecord[]) {
  return {
    type: 'form',
    action: 'activity',
    method: 'post',
    submitLabel: { t: 'clubs.saveActivity' },
    fields: [
      {
        name: 'clubId',
        kind: 'select',
        label: { t: 'clubs.name' },
        options: clubsToUse.map((club) => ({ value: String(club.id), label: club.name })),
      },
      { name: 'title', kind: 'text', label: { t: 'clubs.activityTitle' } },
      { name: 'description', kind: 'text', label: { t: 'clubs.activityBody' } },
      { name: 'activityDate', kind: 'date', label: { t: 'clubs.date' } },
    ],
  };
}

export default clubs;
