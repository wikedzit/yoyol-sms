export type LevelType = 'o-level' | 'a-level';

export interface Level {
  id: string;
  name: string;
  type: LevelType;
  description: string;
}

export interface Stream {
  id: string;
  name: string;
  levelId: string;
  levelType: LevelType;
  color: 'science' | 'arts' | 'business';
}

export interface Form {
  id: string;
  name: string;
  number: number;
  streamId: string;
  levelId: string;
}

export interface Class {
  id: string;
  name: string;
  formId: string;
  streamId: string;
  levelId: string;
  studentCount: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  formId: string;
  teacherId?: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  classId: string;
  formId: string;
  enrollmentDate: string;
  email?: string;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subjects: string[];
  formIds: string[];
}
