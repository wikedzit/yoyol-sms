type Choice = { id: number; name: string };

type ClubRow = {
  id: number;
  name: string;
  description: string;
  patronId: number;
  patronName: string;
  closed: boolean;
  canWrite: boolean;
  memberCount: number;
};

type MemberRow = { id: number; studentName: string };

type ActivityRow = {
  id: number;
  title: string;
  description: string;
  activityDate: string;
  canWrite: boolean;
};

type TextValue = string | { t: string };

type Cell = TextValue | { type: 'badge'; label: TextValue; tone?: 'neutral' | 'success' } | {
  type: 'button';
  label: TextValue;
  action: string;
  values?: Record<string, string>;
};

// The clubs list is one table. Each club then has its own page for members
// and activities, so those records are not dumped under every club.
export function clubListDocument(input: {
  canManage: boolean;
  clubs: ClubRow[];
  teachers: Choice[];
}) {
  return {
    viewVersion: 1 as const,
    title: { t: 'clubs.title' },
    body: [
      { type: 'text', value: { t: 'clubs.description' } },
      clubsTable(input.clubs, input),
    ],
  };
}

export function clubDetailDocument(input: {
  club: ClubRow;
  canManage: boolean;
  members: MemberRow[];
  activities: ActivityRow[];
  students: Choice[];
  teachers: Choice[];
}) {
  const { club } = input;
  const body: Record<string, unknown>[] = [
    {
      type: 'descriptionList',
      items: [
        { label: { t: 'clubs.about' }, value: club.description },
        { label: { t: 'clubs.patron' }, value: club.patronName },
        { label: { t: 'clubs.status' }, value: { t: club.closed ? 'clubs.closed' : 'clubs.openStatus' } },
      ],
    },
  ];
  if (input.canManage && !club.closed && input.teachers.length > 0) {
    body.unshift({
      type: 'actions',
      body: [
        clubSheet({ t: 'clubs.update' }, { t: 'clubs.edit' }, clubForm(input.teachers, club), 'quiet'),
        {
          type: 'button',
          label: { t: 'clubs.close' },
          action: 'close',
          values: { clubId: String(club.id) },
        },
      ],
    });
  }
  body.push({
    type: 'section',
    heading: { t: 'clubs.members' },
    body: [
      membersTable(input.members, input.canManage),
      ...(input.canManage && !club.closed && input.students.length > 0 ? [enrolForm(club.id, input.students)] : []),
    ],
  });
  body.push({
    type: 'section',
    heading: { t: 'clubs.activities' },
    body: [
      activitiesTable(club.id, input.activities),
      ...(club.canWrite ? [activityForm(club.id, null)] : []),
    ],
  });
  return {
    viewVersion: 1 as const,
    title: club.name,
    breadcrumbs: [
      { label: { t: 'clubs.title' }, href: '/x/clubs' },
      { label: club.name },
    ],
    body,
  };
}

export function clubActivityDocument(input: { club: ClubRow; activity: ActivityRow }) {
  const { club, activity } = input;
  const body: Record<string, unknown>[] = [
    { type: 'text', value: activity.description },
    { type: 'text', value: activity.activityDate },
  ];
  if (activity.canWrite && !club.closed) {
    body.push(activityForm(club.id, activity));
  }
  return {
    viewVersion: 1 as const,
    title: activity.title,
    breadcrumbs: [
      { label: { t: 'clubs.title' }, href: '/x/clubs' },
      { label: club.name, href: `/x/clubs/${club.id}` },
      { label: activity.title },
    ],
    body,
  };
}

export function clubMissingDocument() {
  return {
    viewVersion: 1 as const,
    title: { t: 'clubs.notFound' },
    body: [{ type: 'text', value: { t: 'clubs.notFound' } }],
  };
}

function clubsTable(clubs: ClubRow[], input: { canManage: boolean; teachers: Choice[] }) {
  const canEdit = input.canManage && input.teachers.length > 0;
  return {
    type: 'table',
    ...(canEdit ? {
      toolbar: [clubSheet({ t: 'clubs.add' }, { t: 'clubs.add' }, clubForm(input.teachers, null), 'primary')],
    } : {}),
    columns: [
      { key: 'name', label: { t: 'clubs.name' } },
      { key: 'about', label: { t: 'clubs.about' }, wrap: true },
      { key: 'patron', label: { t: 'clubs.patron' } },
      { key: 'members', label: { t: 'clubs.members' }, align: 'right' as const },
      { key: 'status', label: { t: 'clubs.status' } },
      ...(canEdit ? [{ key: 'actions', label: { t: 'clubs.actions' } }] : []),
    ],
    rows: clubs.map((club) => {
      const canEditClub = canEdit && !club.closed;
      const editSheet = canEditClub
        ? clubSheet({ t: 'clubs.update' }, { t: 'clubs.edit' }, clubForm(input.teachers, club), 'quiet')
        : null;
      return {
        // The name is the edit control, so the page link moves to Manage.
        ...(canEditClub ? {} : { href: `/x/clubs/${club.id}` }),
        cells: {
          name: canEditClub
            ? clubSheet({ t: 'clubs.update' }, club.name, clubForm(input.teachers, club), 'link')
            : club.name,
          about: club.description,
          patron: club.patronName,
          members: String(club.memberCount),
          status: {
            type: 'badge' as const,
            label: { t: club.closed ? 'clubs.closed' : 'clubs.openStatus' },
            tone: club.closed ? 'neutral' as const : 'success' as const,
          },
          ...(editSheet ? {
            actions: {
              type: 'actions' as const,
              body: [
                { type: 'link' as const, label: { t: 'clubs.manage' }, href: `/x/clubs/${club.id}` },
                editSheet,
              ],
            },
          } : {}),
        },
      };
    }),
    emptyText: { t: 'clubs.empty' },
  };
}

function clubSheet(
  title: TextValue,
  trigger: TextValue,
  form: ReturnType<typeof clubForm>,
  emphasis: 'primary' | 'quiet' | 'link',
) {
  return { type: 'sheet' as const, title, trigger, emphasis, body: [form] };
}

function membersTable(members: MemberRow[], canManage: boolean) {
  const columns = [
    { key: 'student', label: { t: 'clubs.student' } },
    ...(canManage ? [{ key: 'actions', label: { t: 'clubs.actions' } }] : []),
  ];
  return {
    type: 'table',
    columns,
    rows: members.map((member) => ({
      cells: {
        student: member.studentName,
        ...(canManage ? {
          actions: {
            type: 'button' as const,
            label: { t: 'clubs.removeMember' },
            action: 'remove-member',
            values: { membershipId: String(member.id) },
          },
        } : {}),
      },
    })),
    emptyText: { t: 'clubs.membersEmpty' },
  };
}

function activitiesTable(clubId: number, activities: ActivityRow[]) {
  const canChange = activities.some((activity) => activity.canWrite);
  return {
    type: 'table',
    columns: [
      { key: 'title', label: { t: 'clubs.activityTitle' } },
      { key: 'date', label: { t: 'clubs.date' } },
      { key: 'about', label: { t: 'clubs.activityBody' }, wrap: true },
      ...(canChange ? [{ key: 'actions', label: { t: 'clubs.actions' } }] : []),
    ],
    rows: activities.map((activity) => ({
      ...(activity.canWrite ? { href: `/x/clubs/${clubId}/activities/${activity.id}` } : {}),
      cells: {
        date: activity.activityDate,
        title: activity.title,
        about: activity.description,
        ...(activity.canWrite ? {
          actions: {
            type: 'button' as const,
            label: { t: 'clubs.removeActivity' },
            action: 'remove-activity',
            values: { activityId: String(activity.id) },
          } satisfies Cell,
        } : {}),
      },
    })),
    emptyText: { t: 'clubs.activitiesEmpty' },
  };
}

function clubForm(teachers: Choice[], club: ClubRow | null) {
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
        options: teachers.map((teacher) => ({ value: String(teacher.id), label: teacher.name })),
      },
    ],
  };
}

function enrolForm(clubId: number, students: Choice[]) {
  return {
    type: 'form',
    action: 'enrol',
    method: 'post',
    submitLabel: { t: 'clubs.enrol' },
    fields: [
      { name: 'clubId', kind: 'hidden', value: String(clubId) },
      {
        name: 'studentId',
        kind: 'select',
        label: { t: 'clubs.student' },
        options: students.map((student) => ({ value: String(student.id), label: student.name })),
      },
    ],
  };
}

function activityForm(clubId: number, activity: ActivityRow | null) {
  return {
    type: 'form',
    action: 'activity',
    method: 'post',
    submitLabel: { t: 'clubs.saveActivity' },
    fields: [
      { name: 'clubId', kind: 'hidden', value: String(clubId) },
      ...(activity ? [{ name: 'activityId', kind: 'hidden', value: String(activity.id) }] : []),
      {
        name: 'title',
        kind: 'text',
        label: { t: 'clubs.activityTitle' },
        ...(activity ? { value: activity.title } : {}),
      },
      {
        name: 'description',
        kind: 'text',
        label: { t: 'clubs.activityBody' },
        ...(activity ? { value: activity.description } : {}),
      },
      {
        name: 'activityDate',
        kind: 'date',
        label: { t: 'clubs.date' },
        ...(activity ? { value: activity.activityDate } : {}),
      },
    ],
  };
}
