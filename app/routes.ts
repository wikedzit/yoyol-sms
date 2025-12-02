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
    ]),
  ]),

  route('logout', './routes/logout.ts'),
  //protected
  layout('./layout/ProtectedLayout.tsx', [
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

      route('students', './routes/students.tsx'),
      route('classes', './routes/classes.tsx'),
      route('classes/:classId', './routes/classes.$classId.tsx'),
      route('departments', './routes/departments/departments.tsx'),
      route('departments/:id', './routes/departments/departments.$id.tsx'),
      route(
        'departments/:id/teacher',
        './routes/departments/departments.$id.teacher.tsx'
      ),
      route(
        'departments/:id/subject',
        './routes/departments/departments.$id.subject.tsx'
      ),
      route(
        'departments/:id/classes',
        './routes/departments/departments.$id.classroom.tsx'
      ),
      route('subjects', './routes/subject.tsx'),
      route('courses', './routes/courses/courses.tsx'),
      route('courses/:id', './routes/courses/courses.$id.tsx'),
      route('teachers', './routes/teachers.tsx'),
      route('grades', './routes/grades.tsx'),
      route('settings', './routes/settings.tsx'),
      route('attendance', './routes/attendance.tsx'),
    ]),
  ]),
];

export default routes;
