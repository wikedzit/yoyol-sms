import absenceAlerts from '../../extensions/absence-alerts/yoyol.extension.json';
import academics from '../../extensions/academics/yoyol.extension.json';
import attendance from '../../extensions/attendance/yoyol.extension.json';
import feeReminders from '../../extensions/fee-reminders/yoyol.extension.json';
import finance from '../../extensions/finance/yoyol.extension.json';
import clubs from '../../extensions/clubs/yoyol.extension.json';
import email from '../../extensions/email/yoyol.extension.json';
import discipline from '../../extensions/discipline/yoyol.extension.json';
import leadership from '../../extensions/leadership/yoyol.extension.json';
import lessonPlans from '../../extensions/lesson-plans/yoyol.extension.json';
import timetable from '../../extensions/timetable/yoyol.extension.json';
import assessment from '../../extensions/assessment/yoyol.extension.json';
import hello from '../../extensions/hello/yoyol.extension.json';
import notices from '../../extensions/notices/yoyol.extension.json';
import reports from '../../extensions/reports/yoyol.extension.json';
import sms from '../../extensions/sms/yoyol.extension.json';
import staff from '../../extensions/staff/yoyol.extension.json';
import students from '../../extensions/students/yoyol.extension.json';
import themes from '../../extensions/themes/yoyol.extension.json';
import { parseManifest, type ExtensionManifest } from './manifest';

// Static imports so the Worker build includes every bundled extension.
// The layout test fails when a folder under extensions/ is missing here.
const sources = [absenceAlerts, academics, assessment, attendance, clubs, discipline, email, feeReminders, finance, hello, leadership, lessonPlans, notices, reports, sms, staff, students, themes, timetable];

export const bundledManifests: ExtensionManifest[] = sources.map((source) => parseManifest(source));

export function findBundledManifest(key: string): ExtensionManifest | null {
  return bundledManifests.find((manifest) => manifest.key === key) ?? null;
}
