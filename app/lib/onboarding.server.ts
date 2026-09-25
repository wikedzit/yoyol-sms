import type { SelectCampus } from 'workers/database/campuses';
import type { SelectSchool } from 'workers/database/school';
import type CampusService from 'workers/services/campus';
import type SchoolService from 'workers/services/school';

export type OnboardingStep = 'school' | 'campus' | 'complete';

export type OwnerOnboardingStatus = {
  step: OnboardingStep;
  school: SelectSchool | null;
  campuses: SelectCampus[];
};

export async function getOwnerOnboardingStatus(services: {
  school: SchoolService;
  campus: CampusService;
}): Promise<OwnerOnboardingStatus> {
  const schools = await services.school.getAll();
  const school = schools[0] ?? null;

  if (!school) {
    return {
      step: 'school',
      school: null,
      campuses: [],
    };
  }

  const campuses = await services.campus.getBySchoolId(school.id);

  if (campuses.length === 0) {
    return {
      step: 'campus',
      school,
      campuses,
    };
  }

  return {
    step: 'complete',
    school,
    campuses,
  };
}

export function hasFinishedOnboarding(
  status: OwnerOnboardingStatus,
): boolean {
  return status.step === 'complete';
}
