import absenceAlertsEn from '../../plugins/absence-alerts/locales/en.json';
import absenceAlertsSw from '../../plugins/absence-alerts/locales/sw.json';
import academicsEn from '../../modules/academics/locales/en.json';
import attendanceEn from '../../modules/attendance/locales/en.json';
import attendanceSw from '../../modules/attendance/locales/sw.json';
import feeRemindersEn from '../../plugins/fee-reminders/locales/en.json';
import feeRemindersSw from '../../plugins/fee-reminders/locales/sw.json';
import financeEn from '../../modules/finance/locales/en.json';
import financeSw from '../../modules/finance/locales/sw.json';
import clubsEn from '../../modules/clubs/locales/en.json';
import clubsSw from '../../modules/clubs/locales/sw.json';
import emailEn from '../../plugins/email/locales/en.json';
import emailSw from '../../plugins/email/locales/sw.json';
import disciplineEn from '../../modules/discipline/locales/en.json';
import disciplineSw from '../../modules/discipline/locales/sw.json';
import leadershipEn from '../../modules/leadership/locales/en.json';
import leadershipSw from '../../modules/leadership/locales/sw.json';
import lessonPlansEn from '../../modules/lesson-plans/locales/en.json';
import lessonPlansSw from '../../modules/lesson-plans/locales/sw.json';
import timetableEn from '../../modules/timetable/locales/en.json';
import timetableSw from '../../modules/timetable/locales/sw.json';
import academicsSw from '../../modules/academics/locales/sw.json';
import assessmentEn from '../../modules/assessment/locales/en.json';
import assessmentSw from '../../modules/assessment/locales/sw.json';
import helloEn from '../../plugins/hello/locales/en.json';
import helloSw from '../../plugins/hello/locales/sw.json';
import noticesEn from '../../modules/notices/locales/en.json';
import noticesSw from '../../modules/notices/locales/sw.json';
import reportsEn from '../../modules/reports/locales/en.json';
import reportsSw from '../../modules/reports/locales/sw.json';
import smsEn from '../../plugins/sms/locales/en.json';
import smsSw from '../../plugins/sms/locales/sw.json';
import staffEn from '../../modules/staff/locales/en.json';
import staffSw from '../../modules/staff/locales/sw.json';
import studentsEn from '../../modules/students/locales/en.json';
import studentsSw from '../../modules/students/locales/sw.json';
import themesEn from '../../themes/locales/en.json';
import themesSw from '../../themes/locales/sw.json';

type LocaleCatalog = { en: Record<string, string>; sw: Record<string, string> };

function catalog(en: object, sw: object): LocaleCatalog {
  return {
    en: en as Record<string, string>,
    sw: sw as Record<string, string>,
  };
}

const catalogs: Record<string, LocaleCatalog> = {
  'absence-alerts': catalog(absenceAlertsEn, absenceAlertsSw),
  academics: catalog(academicsEn, academicsSw),
  attendance: catalog(attendanceEn, attendanceSw),
  'fee-reminders': catalog(feeRemindersEn, feeRemindersSw),
  finance: catalog(financeEn, financeSw),
  clubs: catalog(clubsEn, clubsSw),
  email: catalog(emailEn, emailSw),
  discipline: catalog(disciplineEn, disciplineSw),
  leadership: catalog(leadershipEn, leadershipSw),
  'lesson-plans': catalog(lessonPlansEn, lessonPlansSw),
  timetable: catalog(timetableEn, timetableSw),
  assessment: catalog(assessmentEn, assessmentSw),
  hello: catalog(helloEn, helloSw),
  notices: catalog(noticesEn, noticesSw),
  reports: catalog(reportsEn, reportsSw),
  sms: catalog(smsEn, smsSw),
  staff: catalog(staffEn, staffSw),
  students: catalog(studentsEn, studentsSw),
  themes: catalog(themesEn, themesSw),
};

export function localesFor(extensionKey: string): LocaleCatalog {
  return catalogs[extensionKey] ?? { en: {}, sw: {} };
}
