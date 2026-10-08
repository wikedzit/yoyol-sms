import absenceAlerts from '../../plugins/absence-alerts/yoyol.extension.json';
import academics from '../../modules/academics/yoyol.extension.json';
import attendance from '../../modules/attendance/yoyol.extension.json';
import feeReminders from '../../plugins/fee-reminders/yoyol.extension.json';
import finance from '../../modules/finance/yoyol.extension.json';
import clubs from '../../modules/clubs/yoyol.extension.json';
import email from '../../plugins/email/yoyol.extension.json';
import discipline from '../../modules/discipline/yoyol.extension.json';
import leadership from '../../modules/leadership/yoyol.extension.json';
import lessonPlans from '../../modules/lesson-plans/yoyol.extension.json';
import timetable from '../../modules/timetable/yoyol.extension.json';
import assessment from '../../modules/assessment/yoyol.extension.json';
import hello from '../../plugins/hello/yoyol.extension.json';
import notices from '../../modules/notices/yoyol.extension.json';
import reports from '../../modules/reports/yoyol.extension.json';
import sms from '../../plugins/sms/yoyol.extension.json';
import staff from '../../modules/staff/yoyol.extension.json';
import students from '../../modules/students/yoyol.extension.json';
import themes from '../../themes/yoyol.extension.json';
import { parseManifest, type ExtensionManifest } from './manifest';

// Static imports so the Worker build includes every bundled extension.
// The layout test fails when a package folder is missing here.
const sources = [absenceAlerts, academics, assessment, attendance, clubs, discipline, email, feeReminders, finance, hello, leadership, lessonPlans, notices, reports, sms, staff, students, themes, timetable];

export const bundledManifests: ExtensionManifest[] = sources.map((source) => parseManifest(source));

export function findBundledManifest(key: string): ExtensionManifest | null {
  return bundledManifests.find((manifest) => manifest.key === key) ?? null;
}
