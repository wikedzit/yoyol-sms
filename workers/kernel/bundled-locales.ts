import absenceAlertsEn from '../../extensions/absence-alerts/locales/en.json';
import absenceAlertsSw from '../../extensions/absence-alerts/locales/sw.json';
import academicsEn from '../../extensions/academics/locales/en.json';
import attendanceEn from '../../extensions/attendance/locales/en.json';
import attendanceSw from '../../extensions/attendance/locales/sw.json';
import feeRemindersEn from '../../extensions/fee-reminders/locales/en.json';
import feeRemindersSw from '../../extensions/fee-reminders/locales/sw.json';
import financeEn from '../../extensions/finance/locales/en.json';
import financeSw from '../../extensions/finance/locales/sw.json';
import clubsEn from '../../extensions/clubs/locales/en.json';
import clubsSw from '../../extensions/clubs/locales/sw.json';
import emailEn from '../../extensions/email/locales/en.json';
import emailSw from '../../extensions/email/locales/sw.json';
import disciplineEn from '../../extensions/discipline/locales/en.json';
import disciplineSw from '../../extensions/discipline/locales/sw.json';
import leadershipEn from '../../extensions/leadership/locales/en.json';
import leadershipSw from '../../extensions/leadership/locales/sw.json';
import lessonPlansEn from '../../extensions/lesson-plans/locales/en.json';
import lessonPlansSw from '../../extensions/lesson-plans/locales/sw.json';
import timetableEn from '../../extensions/timetable/locales/en.json';
import timetableSw from '../../extensions/timetable/locales/sw.json';
import academicsSw from '../../extensions/academics/locales/sw.json';
import assessmentEn from '../../extensions/assessment/locales/en.json';
import assessmentSw from '../../extensions/assessment/locales/sw.json';
import helloEn from '../../extensions/hello/locales/en.json';
import helloSw from '../../extensions/hello/locales/sw.json';
import noticesEn from '../../extensions/notices/locales/en.json';
import noticesSw from '../../extensions/notices/locales/sw.json';
import reportsEn from '../../extensions/reports/locales/en.json';
import reportsSw from '../../extensions/reports/locales/sw.json';
import smsEn from '../../extensions/sms/locales/en.json';
import smsSw from '../../extensions/sms/locales/sw.json';
import staffEn from '../../extensions/staff/locales/en.json';
import staffSw from '../../extensions/staff/locales/sw.json';
import studentsEn from '../../extensions/students/locales/en.json';
import studentsSw from '../../extensions/students/locales/sw.json';
import themesEn from '../../extensions/themes/locales/en.json';
import themesSw from '../../extensions/themes/locales/sw.json';

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
