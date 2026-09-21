import type { SelectCampus } from 'workers/database/campuses';
import type { SelectSchool } from 'workers/database/school';
import type CampusService from 'workers/services/campus';
import type SchoolService from 'workers/services/school';
import type StudentService from 'workers/services/student';
import type TeacherService from 'workers/services/teachers';
export type SchoolProfileCampus = SelectCampus & {
  totalStudents: number;
}

export type SchoolProfileData = {
  school: SelectSchool | null;
  campuses: SchoolProfileCampus[];
  totalTeachers: number;
  totalStudents: number;
};

export async function loadSchoolProfile(services: {
  school: SchoolService;
  campus: CampusService;
  teacher: TeacherService;
  student: StudentService;
}): Promise<SchoolProfileData> {
  const schools = await services.school.getAll();
  const school = schools[0] ?? null;

  if (!school) {
    return {
      school: null,
      campuses: [],
      totalTeachers: 0,
      totalStudents: 0,
    };
  }

  const [totalTeachers, totalStudents, campuses] = await Promise.all([
      services.teacher.countAll(),
      services.student.countAll(),
      services.campus.getBySchoolId(school.id),
    ]);

  // Get the student count for every campus.
  const campusesWithStudentCount =
    await Promise.all(
      campuses.map(async (campus) => {
        const totalStudents =
          await services.student.countByCampusId(
            campus.id,
          );

        return {
          ...campus,
          totalStudents,
        };
      }),
    );

  return {
    school,
    campuses: campusesWithStudentCount,
    totalTeachers,
    totalStudents,
  };
}

export const emptySchoolProfile: SchoolProfileData = {
  school: null,
  campuses: [],
  totalTeachers: 0,
  totalStudents: 0,
};
