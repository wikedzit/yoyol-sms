import absenceAlerts from '../../plugins/absence-alerts/entrypoint';
import academics from '../../modules/academics/entrypoint';
import attendance from '../../modules/attendance/entrypoint';
import feeReminders from '../../plugins/fee-reminders/entrypoint';
import finance from '../../modules/finance/entrypoint';
import clubs from '../../modules/clubs/entrypoint';
import email from '../../plugins/email/entrypoint';
import discipline from '../../modules/discipline/entrypoint';
import leadership from '../../modules/leadership/entrypoint';
import lessonPlans from '../../modules/lesson-plans/entrypoint';
import timetable from '../../modules/timetable/entrypoint';
import assessment from '../../modules/assessment/entrypoint';
import notices from '../../modules/notices/entrypoint';
import reports from '../../modules/reports/entrypoint';
import sms from '../../plugins/sms/entrypoint';
import staff from '../../modules/staff/entrypoint';
import students from '../../modules/students/entrypoint';
import themes from '../../themes/entrypoint';
import type { ExtensionEntrypoint } from './sdk';

// Static imports so the Worker build includes every bundled entrypoint.
// The layout test fails when a package folder is missing here.
const entrypoints: ExtensionEntrypoint[] = [
  absenceAlerts,
  academics,
  assessment,
  attendance,
  email,
  feeReminders,
  finance,
  clubs,
  discipline,
  leadership,
  lessonPlans,
  timetable,
  notices,
  reports,
  sms,
  staff,
  students,
  themes,
];

export function findBundledEntrypoint(key: string): ExtensionEntrypoint | null {
  return entrypoints.find((entrypoint) => entrypoint.manifest.key === key) ?? null;
}
