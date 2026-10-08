import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from '@react-router/dev/routes';

const routes: RouteConfig = [
  // Public auth routes (no protection)
  ...prefix('auth', [
    layout('./layout/AuthLayout.tsx', [
      route('login', './routes/auth/SignIn.tsx'),
      route('signup', './routes/auth/sign-up.tsx'),
      route('forgot', './routes/auth/forgot.tsx'),
      route('reset', './routes/auth/reset.tsx'),
      route('invite', './routes/auth/invite.tsx'),
    ]),
  ]),

  route('logout', './routes/logout.ts'),
  route('health', './routes/health.ts'),
  route('api/v1/schools', './routes/api.schools.ts'),
  route('api/v1/openapi.json', './routes/api.openapi.ts'),
  route('themes/template', './routes/themes.template.ts'),
  route('themes/example', './routes/themes.example.ts'),
  // Protected routes
  layout('./layout/ProtectedLayout.tsx', [
    route('onboarding', './routes/onboarding.tsx'),
    layout('./layout/DashboardLyout.tsx', [
      index('routes/home.tsx'),
      ...prefix('levels', [
        // O-Level routes
        route('o-level', './routes/academicLevels/o-level.tsx'),
        route('o-level/:streamId', './routes/academicLevels/StreamPage.tsx', {
          id: 'o-level-stream',
        }),
        route(
          'o-level/:streamId/forms/:formId',
          './routes/academicLevels/FormPage.tsx',
          { id: 'o-level-form' }
        ),
        // A-Level routes
        route('a-level', './routes/academicLevels/a-level.tsx'),
        route('a-level/:streamId', './routes/academicLevels/StreamPage.tsx', {
          id: 'a-level-stream',
        }),
        route(
          'a-level/:streamId/forms/:formId',
          './routes/academicLevels/FormPage.tsx',
          { id: 'a-level-form' }
        ),
      
      ]),

...prefix('schools', [
  route('profile', './routes/schools/profile.tsx'),
  route('new', './routes/schools/new.tsx'),
  route('access', './routes/schools/access.ts'),
  route('members', './routes/schools/members.tsx'),
  route('invitations', './routes/schools/invitations.tsx'),
  route('roles', './routes/schools/roles.tsx'),
  route('switch', './routes/schools/switch.ts'),
  route(':schoolId', './routes/schools/detail.tsx', { id: 'school-profile' }),
  route('academic-year', './routes/schools/academic-year.tsx'),
  route(':schoolId/campuses', './routes/campuses/campuses.tsx'),
  route(':schoolId/campuses/new_campus', './routes/campuses/new_campus.tsx'),
]),

      route('students', './routes/students.tsx'),
      route('enrolments', './routes/enrolments.tsx'),
      route('guardians', './routes/guardians.tsx'),
      route('student-subjects', './routes/student-subjects.tsx'),
      route('portal', './routes/portal.tsx'),
      route('students/:studentId/data.json', './routes/student.data.ts'),
      route('retention/run', './routes/retention.run.ts'),
      route('profile', './routes/profile.tsx'),
      route('profile/security', './routes/profile.security.tsx'),
      route('classes', './routes/classes.tsx'),
      route('classes/:classId', './routes/classes.$classId.tsx'),
      route('subjects', './routes/subject.tsx'),
      route('combinations', './routes/combinations.tsx'),
      route('teachers', './routes/teachers.tsx'),
      route('staff', './routes/staff.tsx'),
      route('grades', './routes/grades.tsx'),
      route('marks', './routes/marks.tsx'),
      route('report-card', './routes/report-card.tsx'),
      route('calendar', './routes/calendar.tsx'),
      route('settings', './routes/settings.tsx'),
      route('modules', './routes/extensions.tsx', { id: 'modules-page' }),
      route('plugins', './routes/extensions.tsx', { id: 'plugins-page' }),
      route('extensions', './routes/extensions.redirect.ts'),
      route('inbox', './routes/inbox.tsx'),
      route('audit', './routes/audit.tsx'),
      route('audit.csv', './routes/audit.export.ts'),
      route('reports/students.csv', './routes/reports.export.ts', { id: 'reports-students' }),
      route('reports/staff.csv', './routes/reports.export.ts', { id: 'reports-staff' }),
      route('reports/fees.csv', './routes/reports.export.ts', { id: 'reports-fees' }),
      route('x/:extension/*', './routes/extension-page.tsx'),
      route('themes', './routes/themes.tsx'),
      route('attendance', './routes/attendance.tsx'),
    ]),
  ]),
];

export default routes;
