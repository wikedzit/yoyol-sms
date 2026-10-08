import academicsInitial from '../../extensions/academics/schema/001_initial.json';
import attendanceInitial from '../../extensions/attendance/schema/001_initial.json';
import financeInitial from '../../extensions/finance/schema/001_initial.json';
import clubsInitial from '../../extensions/clubs/schema/001_initial.json';
import disciplineInitial from '../../extensions/discipline/schema/001_initial.json';
import leadershipInitial from '../../extensions/leadership/schema/001_initial.json';
import lessonPlansInitial from '../../extensions/lesson-plans/schema/001_initial.json';
import timetableInitial from '../../extensions/timetable/schema/001_initial.json';
import academicsSubjectLevel from '../../extensions/academics/schema/002_subject_level.json';
import academicsFormClassSubjects from '../../extensions/academics/schema/003_form_class_subjects.json';
import academicsCombinations from '../../extensions/academics/schema/004_subject_combinations.json';
import assessmentInitial from '../../extensions/assessment/schema/001_initial.json';
import noticesInitial from '../../extensions/notices/schema/001_initial.json';
import reportsInitial from '../../extensions/reports/schema/001_initial.json';
import staffInitial from '../../extensions/staff/schema/001_initial.json';
import studentsInitial from '../../extensions/students/schema/001_initial.json';
import { parseModuleMigration, type ModuleMigration } from './module-schema';

// Static imports so the Worker build includes every bundled migration.
// The layout test fails when a schema file is missing here.
const sources: Record<string, unknown[]> = {
  academics: [academicsInitial, academicsSubjectLevel, academicsFormClassSubjects, academicsCombinations],
  attendance: [attendanceInitial],
  finance: [financeInitial],
  clubs: [clubsInitial],
  discipline: [disciplineInitial],
  leadership: [leadershipInitial],
  'lesson-plans': [lessonPlansInitial],
  timetable: [timetableInitial],
  assessment: [assessmentInitial],
  notices: [noticesInitial],
  reports: [reportsInitial],
  staff: [staffInitial],
  students: [studentsInitial],
};

export const bundledMigrations: Record<string, ModuleMigration[]> = Object.fromEntries(
  Object.entries(sources).map(([key, migrations]) => [key, migrations.map((migration) => parseModuleMigration(migration))]),
);

export function migrationsFor(extensionKey: string): ModuleMigration[] {
  return bundledMigrations[extensionKey] ?? [];
}
