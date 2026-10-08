import absenceAlerts from '../../extensions/absence-alerts/entrypoint';
import academics from '../../extensions/academics/entrypoint';
import attendance from '../../extensions/attendance/entrypoint';
import feeReminders from '../../extensions/fee-reminders/entrypoint';
import finance from '../../extensions/finance/entrypoint';
import clubs from '../../extensions/clubs/entrypoint';
import email from '../../extensions/email/entrypoint';
import discipline from '../../extensions/discipline/entrypoint';
import leadership from '../../extensions/leadership/entrypoint';
import lessonPlans from '../../extensions/lesson-plans/entrypoint';
import timetable from '../../extensions/timetable/entrypoint';
import assessment from '../../extensions/assessment/entrypoint';
import hello from '../../extensions/hello/entrypoint';
import notices from '../../extensions/notices/entrypoint';
import reports from '../../extensions/reports/entrypoint';
import sms from '../../extensions/sms/entrypoint';
import staff from '../../extensions/staff/entrypoint';
import students from '../../extensions/students/entrypoint';
import themes from '../../extensions/themes/entrypoint';
import type { ExtensionEntrypoint } from './sdk';

// Static imports so the Worker build includes every bundled entrypoint.
// The layout test fails when a folder under extensions/ is missing here.
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
  hello,
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
