import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from '@react-router/dev/routes';

const routes: RouteConfig = [
  ...prefix('auth', [
    layout('./layout/AuthLayout.tsx', [
      route('login', './routes/auth/SignIn.tsx'),
    ]),
  ]),

  layout('./layout/DashboardLyout.tsx', [
    index('routes/home.tsx'),
    route('classrooms', './routes/classrooms.tsx'),
    route('classrooms/:id', './routes/classroomItem.$id.tsx'),
    route('students', './routes/students.tsx'),
    route('departments', './routes/departments.tsx'),
    route('subjects', './routes/subject.tsx'),
    route('courses', './routes/courses.tsx'),
    route('teachers', './routes/teachers.tsx'),
    route('grades', './routes/grades.tsx'),
    route('settings', './routes/settings.tsx'),
    route('attendance', './routes/attendance.tsx'),
  ]),
];

export default routes;
