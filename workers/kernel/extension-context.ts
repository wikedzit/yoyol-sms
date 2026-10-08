import type { LifecycleContext } from './sdk';

export type ExtensionContext = {
  schoolId: number;
  settings: {
    get: (key: string) => Promise<string | null>;
  };
  core: {
    students?: {
      list: () => Promise<unknown>;
      records?: () => Promise<string[]>;
      enrolments?: () => Promise<string[]>;
      guardians?: () => Promise<string[]>;
      yearSubjects?: () => Promise<string[]>;
      results?: () => Promise<string[]>;
    };
    academics?: {
      list: () => Promise<string[]>;
      calendar: () => Promise<string[]>;
      subjects: () => Promise<string[]>;
      classSubjects: () => Promise<string[]>;
      combinations: () => Promise<string[]>;
      events?: () => Promise<string[]>;
    };
  };
  attendance?: {
    canWrite: () => Promise<boolean>;
    canManage: () => Promise<boolean>;
    classes: () => Promise<{ id: number; name: string }[]>;
    roll: (classId: number, date: string) => Promise<{
      error?: string;
      className: string;
      date: string;
      students: { id: number; name: string; status: string; comment: string }[];
    }>;
    summary: () => Promise<string[]>;
    today: () => Promise<string>;
    settings: () => Promise<{ editableDays: string; absenceAlerts: string }>;
    mark: (fields: Record<string, string>) => Promise<{ error: string } | { ok: true }>;
    profileLines: (studentId: number | null) => Promise<string[]>;
    dashboardLines: () => Promise<string[]>;
  };
  finance?: LifecycleContext['finance'];
  timetable?: LifecycleContext['timetable'];
  lessonPlans?: LifecycleContext['lessonPlans'];
  discipline?: LifecycleContext['discipline'];
  clubs?: LifecycleContext['clubs'];
  leadership?: LifecycleContext['leadership'];
  reports?: LifecycleContext['reports'];
  channels?: LifecycleContext['channels'];
  notifications?: {
    send: (message: { userId: number; title: string; body: string }) => Promise<void>;
  };
  log: {
    info: (message: string, details?: Record<string, unknown>) => void;
    error: (message: string, details?: Record<string, unknown>) => void;
  };
};

export function extensionMaySend(granted: readonly string[]): boolean {
  return granted.includes('notifications:send');
}

export function createExtensionContext(input: {
  schoolId: number;
  granted: readonly string[];
  settings: ExtensionContext['settings'];
  students?: ExtensionContext['core']['students'];
  academics?: ExtensionContext['core']['academics'];
  notifications?: ExtensionContext['notifications'];
  attendance?: ExtensionContext['attendance'];
  finance?: ExtensionContext['finance'];
  timetable?: ExtensionContext['timetable'];
  lessonPlans?: ExtensionContext['lessonPlans'];
  discipline?: ExtensionContext['discipline'];
  clubs?: ExtensionContext['clubs'];
  leadership?: ExtensionContext['leadership'];
  reports?: ExtensionContext['reports'];
  channels?: ExtensionContext['channels'];
  log: ExtensionContext['log'];
}): ExtensionContext {
  const core: ExtensionContext['core'] = {};
  if (input.granted.includes('core.students:read') && input.students) {
    core.students = input.students;
  }
  if (input.granted.includes('core.academics:read') && input.academics) {
    core.academics = input.academics;
  }

  return {
    schoolId: input.schoolId,
    settings: input.settings,
    core,
    notifications: extensionMaySend(input.granted) ? input.notifications : undefined,
    attendance: input.attendance,
    finance: input.finance,
    timetable: input.timetable,
    lessonPlans: input.lessonPlans,
    discipline: input.discipline,
    clubs: input.clubs,
    leadership: input.leadership,
    reports: input.reports,
    channels: input.channels,
    log: input.log,
  };
}
