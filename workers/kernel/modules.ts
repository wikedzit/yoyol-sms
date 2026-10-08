// The shell is built from modules. Kernel modules cannot be removed.
// Core modules ship installed. An optional module adds its menu item only
// after a school installs it. Extensions and Themes are shell pages: they
// manage the app, they are not records of one school.

export type ModulePresence = 'kernel' | 'core' | 'optional';

export type ModulePermission = {
  key: string;
  label: { en: string; sw: string };
  defaultRoles: readonly string[];
};

export type ModuleMenuItem = {
  labelKey: string;
  path: string;
};

export type AppModule = {
  key: string;
  presence: ModulePresence;
  name: { en: string; sw: string };
  menuLabelKey: string;
  menuOrder: number;
  menu: readonly ModuleMenuItem[];
  permissions: readonly ModulePermission[];
};

export const appModules: readonly AppModule[] = [
  {
    key: 'access',
    presence: 'kernel',
    name: { en: 'Access', sw: 'Ufikiaji' },
    menuLabelKey: 'access',
    menuOrder: 30,
    menu: [
      { labelKey: 'schoolMembers', path: '/schools/members' },
      { labelKey: 'invitations', path: '/schools/invitations' },
      { labelKey: 'schoolRoles', path: '/schools/roles' },
      { labelKey: 'inbox', path: '/inbox' },
      { labelKey: 'auditLog', path: '/audit' },
    ],
    permissions: [
      {
        key: 'school.member.manage',
        label: { en: 'Manage school members', sw: 'Simamia wanachama' },
        defaultRoles: ['admin'],
      },
      {
        key: 'school.role.manage',
        label: { en: 'Manage school roles', sw: 'Simamia majukumu' },
        defaultRoles: ['admin'],
      },
    ],
  },
  {
    key: 'school',
    presence: 'core',
    name: { en: 'School', sw: 'Shule' },
    menuLabelKey: 'schoolsSetup',
    menuOrder: 20,
    menu: [
      { labelKey: 'schoolProfile', path: '/schools/profile' },
      { labelKey: 'academicYear', path: '/schools/academic-year' },
      { labelKey: 'schoolCalendar', path: '/calendar' },
    ],
    permissions: [
      {
        key: 'school.profile.read',
        label: { en: 'View the school', sw: 'Angalia shule' },
        defaultRoles: ['admin', 'teacher', 'finance', 'student', 'parent'],
      },
      {
        key: 'school.profile.update',
        label: { en: 'Update the school profile', sw: 'Sasisha wasifu wa shule' },
        defaultRoles: ['admin'],
      },
      {
        key: 'school.archive',
        label: { en: 'Archive or restore the school', sw: 'Hifadhi au rejesha shule' },
        defaultRoles: ['admin'],
      },
      {
        key: 'campus.manage',
        label: { en: 'Manage campuses', sw: 'Simamia kampasi' },
        defaultRoles: ['admin'],
      },
    ],
  },
  {
    key: 'academics',
    presence: 'core',
    name: { en: 'Academics', sw: 'Masomo' },
    menuLabelKey: 'academicLevels',
    menuOrder: 10,
    menu: [
      { labelKey: 'academicStructure', path: '/x/academics' },
      { labelKey: 'oLevel', path: '/levels/o-level' },
      { labelKey: 'aLevel', path: '/levels/a-level' },
      { labelKey: 'combinations', path: '/combinations' },
      { labelKey: 'subjects', path: '/subjects' },
      { labelKey: 'classrooms', path: '/classes' },
    ],
    permissions: [],
  },
  {
    key: 'students',
    presence: 'core',
    name: { en: 'Students', sw: 'Wanafunzi' },
    menuLabelKey: 'studentsList',
    menuOrder: 40,
    menu: [
      { labelKey: 'studentRecords', path: '/x/students' },
      { labelKey: 'enrolments', path: '/enrolments' },
      { labelKey: 'guardians', path: '/guardians' },
      { labelKey: 'studentSubjects', path: '/student-subjects' },
      { labelKey: 'myProfile', path: '/portal' },
      { labelKey: 'studentsList', path: '/students' },
    ],
    permissions: [
      {
        key: 'students.record.read',
        label: { en: 'View student records', sw: 'Angalia wanafunzi' },
        defaultRoles: ['admin', 'teacher', 'student', 'parent'],
      },
      {
        key: 'students.record.write',
        label: { en: 'Change student records', sw: 'Badilisha wanafunzi' },
        defaultRoles: ['admin'],
      },
    ],
  },
  {
    key: 'staff',
    presence: 'core',
    name: { en: 'Staff', sw: 'Wafanyakazi' },
    menuLabelKey: 'teachers',
    menuOrder: 50,
    menu: [
      { labelKey: 'staffRecords', path: '/staff' },
      { labelKey: 'teachers', path: '/teachers' },
    ],
    permissions: [
      {
        key: 'staff.record.read',
        label: { en: 'View staff records', sw: 'Angalia walimu' },
        defaultRoles: ['admin'],
      },
      {
        key: 'staff.record.write',
        label: { en: 'Change staff records', sw: 'Badilisha walimu' },
        defaultRoles: ['admin'],
      },
    ],
  },
  {
    key: 'assessment',
    presence: 'core',
    name: { en: 'Assessment', sw: 'Tathmini' },
    menuLabelKey: 'grades',
    menuOrder: 60,
    menu: [
      { labelKey: 'marks', path: '/marks' },
      { labelKey: 'reportCard', path: '/report-card' },
      { labelKey: 'grades', path: '/grades' },
    ],
    permissions: [],
  },
  {
    key: 'attendance',
    presence: 'core',
    name: { en: 'Attendance', sw: 'Mahudhurio' },
    menuLabelKey: 'attendance',
    menuOrder: 70,
    menu: [{ labelKey: 'attendance', path: '/x/attendance' }],
    permissions: [
      {
        key: 'attendance.record.read',
        label: { en: 'View attendance', sw: 'Angalia mahudhurio' },
        defaultRoles: ['admin', 'teacher', 'student', 'parent'],
      },
      {
        key: 'attendance.record.write',
        label: { en: 'Record attendance', sw: 'Rekodi mahudhurio' },
        defaultRoles: ['admin', 'teacher'],
      },
    ],
  },
  {
    key: 'finance',
    presence: 'core',
    name: { en: 'Finance', sw: 'Fedha' },
    menuLabelKey: 'finance',
    menuOrder: 80,
    menu: [{ labelKey: 'finance', path: '/x/finance' }],
    permissions: [
      {
        key: 'finance.invoice.view',
        label: { en: 'View invoices', sw: 'Angalia ankara' },
        defaultRoles: ['admin', 'finance', 'parent'],
      },
      {
        key: 'finance.payment.record',
        label: { en: 'Record payments', sw: 'Rekodi malipo' },
        defaultRoles: ['admin', 'finance'],
      },
    ],
  },
  {
    key: 'timetable',
    presence: 'core',
    name: { en: 'Timetable', sw: 'Ratiba' },
    menuLabelKey: 'timetable',
    menuOrder: 90,
    menu: [{ labelKey: 'timetable', path: '/x/timetable' }],
    permissions: [
      {
        key: 'timetable.entry.read',
        label: { en: 'View the timetable', sw: 'Angalia ratiba' },
        defaultRoles: ['admin', 'teacher', 'student', 'parent'],
      },
      {
        key: 'timetable.entry.write',
        label: { en: 'Change the timetable', sw: 'Badilisha ratiba' },
        defaultRoles: ['admin'],
      },
    ],
  },
  {
    key: 'lesson-plans',
    presence: 'core',
    name: { en: 'Lesson plans', sw: 'Mipango ya somo' },
    menuLabelKey: 'lessonPlans',
    menuOrder: 100,
    menu: [{ labelKey: 'lessonPlans', path: '/x/lesson-plans' }],
    permissions: [
      {
        key: 'lesson-plans.plan.read',
        label: { en: 'View lesson plans', sw: 'Angalia mipango ya somo' },
        defaultRoles: ['admin', 'teacher'],
      },
      {
        key: 'lesson-plans.plan.write',
        label: { en: 'Write lesson plans', sw: 'Andika mipango ya somo' },
        defaultRoles: ['teacher'],
      },
      {
        key: 'lesson-plans.plan.review',
        label: { en: 'Review lesson plans', sw: 'Hakiki mipango ya somo' },
        defaultRoles: ['admin'],
      },
    ],
  },
  {
    key: 'discipline',
    presence: 'core',
    name: { en: 'Discipline', sw: 'Nidhamu' },
    menuLabelKey: 'discipline',
    menuOrder: 110,
    menu: [{ labelKey: 'discipline', path: '/x/discipline' }],
    permissions: [
      {
        key: 'discipline.incident.read',
        label: { en: 'View incidents', sw: 'Angalia matukio' },
        defaultRoles: ['admin', 'teacher', 'parent'],
      },
      {
        key: 'discipline.incident.write',
        label: { en: 'Record incidents', sw: 'Rekodi matukio' },
        defaultRoles: ['admin', 'teacher'],
      },
      {
        key: 'discipline.incident.close',
        label: { en: 'Close incidents', sw: 'Funga matukio' },
        defaultRoles: ['admin'],
      },
    ],
  },
  {
    key: 'clubs',
    presence: 'core',
    name: { en: 'Clubs', sw: 'Vilabu' },
    menuLabelKey: 'clubs',
    menuOrder: 120,
    menu: [{ labelKey: 'clubs', path: '/x/clubs' }],
    permissions: [
      {
        key: 'clubs.club.read',
        label: { en: 'View clubs', sw: 'Angalia vilabu' },
        defaultRoles: ['admin', 'teacher', 'student', 'parent'],
      },
      {
        key: 'clubs.club.write',
        label: { en: 'Manage clubs', sw: 'Simamia vilabu' },
        defaultRoles: ['admin'],
      },
      {
        key: 'clubs.activity.write',
        label: { en: 'Record club activities', sw: 'Rekodi shughuli za klabu' },
        defaultRoles: ['admin', 'teacher'],
      },
    ],
  },
  {
    key: 'leadership',
    presence: 'core',
    name: { en: 'Leadership', sw: 'Uongozi' },
    menuLabelKey: 'leadership',
    menuOrder: 130,
    menu: [{ labelKey: 'leadership', path: '/x/leadership' }],
    permissions: [
      {
        key: 'leadership.position.read',
        label: { en: 'View leadership', sw: 'Angalia uongozi' },
        defaultRoles: ['admin', 'teacher', 'student', 'parent'],
      },
      {
        key: 'leadership.position.write',
        label: { en: 'Manage leadership', sw: 'Simamia uongozi' },
        defaultRoles: ['admin'],
      },
    ],
  },
  {
    key: 'reports',
    presence: 'core',
    name: { en: 'Reports', sw: 'Ripoti' },
    menuLabelKey: 'reports',
    menuOrder: 140,
    menu: [{ labelKey: 'reports', path: '/x/reports' }],
    permissions: [
      {
        key: 'reports.dashboard.read',
        label: { en: 'View reports', sw: 'Angalia ripoti' },
        defaultRoles: ['admin', 'teacher', 'student', 'parent'],
      },
      {
        key: 'reports.import.write',
        label: { en: 'Import and export records', sw: 'Ingiza na safirisha rekodi' },
        defaultRoles: ['admin'],
      },
    ],
  },
];

export const shellMenu: readonly ModuleMenuItem[] = [
  { labelKey: 'installExtensions', path: '/extensions' },
  { labelKey: 'installThemes', path: '/themes' },
];

export function modulesInTheMenu(): readonly AppModule[] {
  return appModules
    .filter((module) => module.presence !== 'optional')
    .slice()
    .sort((left, right) => left.menuOrder - right.menuOrder);
}

export function moduleForPermission(permissionKey: string): AppModule | null {
  return (
    appModules.find((module) =>
      module.permissions.some((permission) => permission.key === permissionKey),
    ) ?? null
  );
}
