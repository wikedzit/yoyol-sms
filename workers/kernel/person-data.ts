export type PersonGrade = {
  id: number;
  subjectId: number;
  score: number;
  grade: string;
  status: string;
};

export type PersonIdentity = {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  gender: string;
  dob: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  photoUrl: string | null;
  status: string;
};

export type PersonExport = {
  exportedAt: string;
  schoolId: number;
  student: PersonIdentity;
  grades: PersonGrade[];
};

export function personExport(input: {
  exportedAt: string;
  schoolId: number;
  student: PersonIdentity;
  grades: PersonGrade[];
}): PersonExport {
  return {
    exportedAt: input.exportedAt,
    schoolId: input.schoolId,
    student: input.student,
    grades: input.grades.map((grade) => ({
      id: grade.id,
      subjectId: grade.subjectId,
      score: grade.score,
      grade: grade.grade,
      status: grade.status,
    })),
  };
}

export function erasedIdentity(): {
  firstName: string;
  lastName: string;
  dob: null;
  email: null;
  phone: null;
  address: null;
  guardianName: null;
  guardianPhone: null;
  photoUrl: null;
  status: string;
} {
  return {
    firstName: 'Removed',
    lastName: 'Person',
    dob: null,
    email: null,
    phone: null,
    address: null,
    guardianName: null,
    guardianPhone: null,
    photoUrl: null,
    status: 'Archived',
  };
}
