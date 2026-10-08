import academicsInitial from '../../modules/academics/schema/001_initial.json';
import attendanceInitial from '../../modules/attendance/schema/001_initial.json';
import financeInitial from '../../modules/finance/schema/001_initial.json';
import clubsInitial from '../../modules/clubs/schema/001_initial.json';
import disciplineInitial from '../../modules/discipline/schema/001_initial.json';
import leadershipInitial from '../../modules/leadership/schema/001_initial.json';
import lessonPlansInitial from '../../modules/lesson-plans/schema/001_initial.json';
import timetableInitial from '../../modules/timetable/schema/001_initial.json';
import academicsSubjectLevel from '../../modules/academics/schema/002_subject_level.json';
import academicsFormClassSubjects from '../../modules/academics/schema/003_form_class_subjects.json';
import academicsCombinations from '../../modules/academics/schema/004_subject_combinations.json';
import assessmentInitial from '../../modules/assessment/schema/001_initial.json';
import noticesInitial from '../../modules/notices/schema/001_initial.json';
import reportsInitial from '../../modules/reports/schema/001_initial.json';
import staffInitial from '../../modules/staff/schema/001_initial.json';
import studentsInitial from '../../modules/students/schema/001_initial.json';
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
