import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useFetcher } from 'react-router';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import type CampusService from 'workers/services/campus';
import type AcademicLevelService from 'workers/services/academic-levels';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Plus, Search, Eye, Pencil, BookOpen } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

import AddStudentModal from '~/components/modal/AddStudentModal';
import EditStudentModal from '~/components/modal/EditStudentModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { StudentProfilesModal } from '~/components/modal/StudentProfileModal';
import AssignSubjectsToStudentModal from '~/components/modal/AssignSubjectsToStudentModal';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router-dom';
import type StudentService from 'workers/services/student';
import type SubjectService from 'workers/services/subjects';
import type StudentSubjectService from 'workers/services/student-subjects';
import type SchoolService from 'workers/services/school';
// ✅ ADDED: needed to fetch streams/forms
import type AcademicLevelService from 'workers/services/academic-levels';
import { toast } from 'sonner';
import { usePagination } from '~/hooks/usePagination';
import { useLanguage } from '~/lib/i18n';
import { PaginationControls } from '~/components/shared/PaginationControls';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { loadRecordScope, refuseOutsideScope } from '~/lib/load-record-scope';
import { keepVisibleRecords } from 'workers/services/visible-records';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SchoolSlot } from 'workers/services/extensions';

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// 🧠 Loader – fetch students with their assigned subjects + schools + campuses
export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.read');
  const services = context.services as {
    student: StudentService;
    subject: SubjectService;
    studentSubjects: StudentSubjectService;
    school: SchoolService;
    campus: CampusService;
    // ✅ ADDED: type for the academicLevel service
    academicLevel: AcademicLevelService;
  };

  const students = await services.student?.getAll({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });

  const subjects = await services.subject?.getAllSubjects({
    limit: 100,
    offset: 0,
    sortBy: 'subjectName',
    sortOrder: 'asc',
  });

  const schools = await services.school?.getAll();

  const campusesBySchool = await Promise.all(
    (schools ?? []).map((s: any) => services.campus.getBySchoolId(s.id))
  );
  const campuses = campusesBySchool.flat();

  const defaultSchoolId = schools?.[0]?.id ?? null;

  // Fetch streams and forms for the "Add Student" modal
  const streams = await services.academicLevel.getAllStreams();
  const forms = await services.academicLevel.getAllForms();

  const studentsWithSubjects = await Promise.all(
    students.map(async (student) => {
      const assignedSubjects =
        await services.studentSubjects?.getSubjectsByStudent(student.id);
      const school = schools?.find(
        (school) => String(school.id) === String(student.schoolId)
      );
      const studentCampus = campuses.find(
        (c: any) => String(c.id) === String(student.campusId)
      );
      return {
        ...student,
        subjects: assignedSubjects || [],
        schoolName: school?.name || 'Not assigned',
        campusName: studentCampus?.name || 'Not assigned',
      };
    })
  );

  const scope = await loadRecordScope(request, context.services);
  const visibleStudents = keepVisibleRecords(
    studentsWithSubjects,
    scope,
    (item) => item.studentIds,
  );
  const visibleSubjects = keepVisibleRecords(subjects, scope, (item) => item.subjectIds);
  const rememberedSchoolId = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools ?? [], rememberedSchoolId);
  const profileTabs = await studentProfileTabs(context.services, schoolId);

  return {
    students: visibleStudents,
    allSubjects: visibleSubjects,
    schools,
    campuses,
    defaultSchoolId,
    streams,
    forms,
    profileTabs,
  };
}

async function studentProfileTabs(
  services: {
    extensions: {
      enable: (schoolId: number, extensionKey: string) => Promise<void>;
      runSchoolSlot: (schoolId: number, slotName: string, payload: unknown) => Promise<SchoolSlot[]>;
    };
  },
  schoolId: number | null,
) {
  if (schoolId === null) {
    return [];
  }
  try {
    await services.extensions.enable(schoolId, 'timetable');
  } catch {
    // Other profile tabs still load when this hook is already registered.
  }
  try {
    const slots = await services.extensions.runSchoolSlot(schoolId, 'student.profile.tabs', {});
    return slots.flatMap((slot) => (slot.kind === 'document' ? [slot] : []));
  } catch (error) {
    console.error('Unable to load student profile tabs:', error);
    return [];
  }
}
export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.write');
  const form = await request.formData();
  const scope = await loadRecordScope(request, context.services);
  const studentId = Number(form.get('studentId') || form.get('id') || 0) || null;
  refuseOutsideScope(scope, studentId, (item) => item.studentIds);
  const services = context.services as {
    student: StudentService;
    studentSubjects: StudentSubjectService;
    school: SchoolService;
    campus: CampusService;
    academicLevel: AcademicLevelService;
  };
  const method = (form.get('_method') as string) || request.method;
  const action = form.get('action') as string | null;

  try {
    if (action === 'assign_subjects') {
      const studentId = Number(form.get('studentId'));
      const parsedIds = JSON.parse(String(form.get('subjectIds') || '[]'));
      const subjectIds = Array.isArray(parsedIds) ? parsedIds.map((value) => Number(value)) : [];

      if (!studentId) {
        return { error: 'Student ID is required' };
      }

      const saved = await context.services.yearSubjects.saveSubjects(studentId, subjectIds);
      if ('error' in saved) {
        return saved;
      }
      return { success: true, action: 'assign_subjects' };
    }

    if (method === 'POST') {
      const campusIdRaw = form.get('campusId') ? Number(form.get('campusId')) : undefined;

      // If a campus was selected, derive the school from it.
      // Otherwise, fall back to the owner's default (first) school.
      let schoolId: number | undefined;
      let campusId: number | undefined;

      if (campusIdRaw) {
        const selectedCampus = await services.campus.getById(campusIdRaw);
        if (!selectedCampus) {
          return new Response(
            JSON.stringify({ error: 'Selected campus was not found' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        schoolId = selectedCampus.schoolId;
        campusId = selectedCampus.id;
      } else {
        const schools = await services.school.getAll();
        schoolId = schools?.[0]?.id;
      }

      if (!schoolId) {
        return {
          error: "The selected campus is not associated with a school.",
        };
      }

      const admissionNumber = String(form.get("admissionNumber") ?? "").trim();
      const streamId = form.get("streamId")
        ? Number(form.get("streamId"))
        : undefined;

      const formId = form.get("formId")
        ? Number(form.get("formId"))
        : undefined;

      if (!streamId || !formId) {
        return {
          error: "Please select a stream and form.",
        };
      }

      const selectedForm =
        await services.academicLevel.getFormById(formId);

      if (!selectedForm || selectedForm.streamId !== streamId) {
        return {
          error: "Please select a valid stream and form.",
        };
      }

      const formClasses =
        await services.academicLevel.getFormClassesByFormId(formId);
      const formClassId =
        formClasses.length === 1 ? formClasses[0].id : undefined;

      const data = {
        firstName: titleCase(String(form.get("firstName") ?? "")),
        middleName: form.get("middleName")
          ? titleCase(String(form.get("middleName")))
          : undefined,
        lastName: titleCase(String(form.get("lastName") ?? "")),
        gender: String(form.get("gender") ?? "Select gender") as
          "Male" | "Female",
        dob: String(form.get("dob") || form.get("dateOfBirth") || ""),
        email: form.get("email") ? String(form.get("email")) : undefined,
        phone: form.get("phone") ? String(form.get("phone")) : undefined,
        address: form.get("address") ? String(form.get("address")) : undefined,
        guardianName: form.get("guardianName")
          ? titleCase(String(form.get("guardianName")))
          : undefined,

        phone: form.get("phone")
          ? String(form.get("phone")).trim()
          : undefined,

        address: form.get("address")
          ? String(form.get("address")).trim()
          : undefined,

        guardianName: form.get("guardianName")
          ? titleCase(String(form.get("guardianName")).trim())
          : undefined,
        guardianPhone: form.get('guardianPhone')
          ? String(form.get('guardianPhone'))
          : undefined,
        photoUrl: form.get('photoUrl')
          ? String(form.get('photoUrl'))
          : undefined,
        course: form.get('course') ? String(form.get('course')) : undefined,
        grade: form.get('grade') ? String(form.get('grade')) : undefined,
        enrollmentDate: form.get('enrollmentDate')
          ? String(form.get('enrollmentDate'))
          : undefined,

        admissionNumber,

        classId: form.get("classId")
          ? Number(form.get("classId"))
          : undefined,

        formClassId,

        schoolId,
        campusId,
        status: String(form.get("status") ?? "Active") as
          "Active" | "Pending" | "Inactive",
      };

      let created;
      try {
        created = await services.student.create(data);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to add student. Please make sure all required fields are valid.';
        return { error: message };
      }

      if (!created) {
        return {
          error:
            "Failed to add student. Please make sure all required fields are valid.",
        };
      }

      if (formClassId) {
        const currentClass =
          await services.academicLevel.getFormClassById(formClassId);

        if (currentClass) {
          await services.academicLevel.updateFormClass(formClassId, {
            studentCount: (currentClass.studentCount || 0) + 1,
          });
        }
      }

      return {
        success: true,
        student: created,
      };
    }

    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Student ID is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const campusIdRaw = form.get('campusId') ? Number(form.get('campusId')) : undefined;
      let schoolId: string | undefined;
      let campusId: string | undefined;

      if (campusIdRaw) {
        const selectedCampus = await services.campus.getById(campusIdRaw);
        if (selectedCampus) {
          schoolId = String(selectedCampus.schoolId);
          campusId = String(selectedCampus.id);
        }
      } else if (form.get('schoolId')) {
        schoolId = String(form.get('schoolId'));
      }

      const data = {
        firstName: titleCase(String(form.get("firstName") ?? "")),
        middleName: form.get("middleName")
          ? titleCase(String(form.get("middleName")))
          : undefined,
        lastName: titleCase(String(form.get("lastName") ?? "")),
        admissionNumber: form.get('admissionNumber')
          ? String(form.get('admissionNumber')).trim()
          : undefined,
        gender: String(form.get("gender") ?? "Select gender") as
          "Male" | "Female",
        dob: String(form.get("dob") || form.get("dateOfBirth") || ""),
        email: form.get("email") ? String(form.get("email")) : undefined,
        phone: form.get("phone") ? String(form.get("phone")) : undefined,
        address: form.get("address") ? String(form.get("address")) : undefined,
        guardianName: form.get("guardianName")
          ? titleCase(String(form.get("guardianName")))
          : undefined,
        guardianPhone: form.get('guardianPhone')
          ? String(form.get('guardianPhone'))
          : undefined,
        photoUrl: form.get('photoUrl')
          ? String(form.get('photoUrl'))
          : undefined,
        course: form.get('course') ? String(form.get('course')) : undefined,
        grade: form.get('grade') ? String(form.get('grade')) : undefined,
        enrollmentDate: form.get('enrollmentDate')
          ? String(form.get('enrollmentDate'))
          : undefined,
        classId: form.get('classId') ? String(form.get('classId')) : undefined,
        schoolId,
        campusId,
        status: String(form.get("status") ?? "Active") as
          "Active" | "Pending" | "Inactive",
      };

      const updated = await services.student.update(String(id), data);
      return { success: true, student: updated };
    }

    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Student ID is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      await services.student.delete(String(id));
      return { success: true };
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("students.action error:", error);

    return {
      error: error?.message || "Server error.",
    };
  }
}

export default function Students() {
  const { t } = useLanguage();
 const {
  students: initialStudents,
  allSubjects,
  schools,
  campuses,
  defaultSchoolId,
  streams,
  forms,
  profileTabs,
} = useLoaderData() as {
  students: any[];
  allSubjects: any[];
  schools: any[];
  campuses: any[];
  defaultSchoolId: number | null;
  streams: any[];
  forms: any[];
  profileTabs: Extract<SchoolSlot, { kind: 'document' }>[];
};
  const fetcher = useFetcher();
  const listFetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [editStudentModalOpen, setEditStudentModalOpen] = useState(false);
  const [assignSubjectsModalOpen, setAssignSubjectsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<any>(null);

  const filteredStudents = initialStudents?.filter((student) => {
    const matchesSearch =
      (student.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
      (student.middleName || '').toLowerCase().includes(search.toLowerCase()) ||
      (student.lastName || '').toLowerCase().includes(search.toLowerCase()) ||
      (student.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' || student.course === filter || student.grade === filter;
    return matchesSearch && matchesFilter;
  });

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedStudentsList,
    startIndex,
    goToPage,
  } = usePagination(filteredStudents, 10);

  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      lastMethod.current = method ?? fetcher.formMethod;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        return;
      }

      if (data.success) {
        if (data.action === 'assign_subjects') {
          toast.success('Subjects assigned successfully!');
          listFetcher.load(window.location.pathname);
          lastMethod.current = null;
          return;
        }

        switch (lastMethod.current) {
          case 'POST':
            toast.success('Student added successfully!');
            listFetcher.load(window.location.pathname);

            const selectedSchool = schools.find(
              (school: any) => String(school.id) === String(data.student.schoolId)
            );
            const selectedCampus = campuses.find(
              (c: any) => String(c.id) === String(data.student.campusId)
            );

            setNewStudent({
              ...data.student,
              schoolName: selectedSchool?.name || 'Not assigned',
              campusName: selectedCampus?.name || 'Not assigned',
            });

            setAddStudentModalOpen(false);
            setProfileModalOpen(true);
            break;
          case 'PUT':
            toast.success('Student updated successfully!');
            listFetcher.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.success('Student deleted successfully!');
            listFetcher.load(window.location.pathname);
            break;
          default:
            toast.success('Action completed successfully.');
        }

        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data, fetcher.formData]);

  return (
    <div className="space-y-2 h-min-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Students</h1>
          <p className="mt-1 text-sm text-foreground font-medium">
            Manage and view all student records
          </p>
        </div>
        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]  hover:scale-110 hover:text-white-600 transition cursor-pointer"
          onClick={() => setAddStudentModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('addStudent')}
        </Button>
      </div>

      <Card className="border-none shadow-none ">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('searchStudents')}
                className="pl-10 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('filterCourseGrade')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="A">Grade A</SelectItem>
                <SelectItem value="B+">Grade B+</SelectItem>
                <SelectItem value="B">Grade B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold">SN</TableHead>
                  <TableHead className="font-semibold">{t('firstName')}</TableHead>
                  <TableHead className="font-semibold">{t('middleName')}</TableHead>
                  <TableHead className="font-semibold">{t('lastName')}</TableHead>
                  <TableHead className="font-semibold">{t('email')}</TableHead>
                  <TableHead className="font-semibold">
                    {t('assignedSubjects')}
                  </TableHead>
                  <TableHead className="font-semibold">{t('enrolled')}</TableHead>
                  <TableHead className="font-semibold">{t('status')}</TableHead>
                  <TableHead className="text-right font-semibold">
                    {t('actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedStudentsList?.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell>{student.firstName}</TableCell>
                    <TableCell>{student.middleName || ''}</TableCell>
                    <TableCell>{student.lastName}</TableCell>
                    <TableCell>
                      {student.admissionNumber || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.email || "—"}
                    </TableCell>
                    <TableCell>
                      {student.subjects?.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {student.subjects.length}{" "}
                          {student.subjects.length === 1
                            ? "Subject"
                            : "Subjects"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No subjects
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{student.enrollmentDate}</TableCell>
                    <TableCell className="border-none">
                      <Badge
                        variant={
                          student.status === 'Active'
                            ? 'default'
                            : student.status === 'Pending'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="border-none"
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <StudentProfilesModal student={student} profileTabs={profileTabs} />
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Assign Subjects"
                        className="    hover:scale-110 hover:text-white-600 transition cursor-pointer"
                        onClick={() => {
                          setSelectedStudent(student);
                          setAssignSubjectsModalOpen(true);
                        }}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="   hover:scale-110 hover:text-white-600 transition cursor-pointer"
                        onClick={() => {
                          setSelectedStudent(student);
                          setEditStudentModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteStudentButton
                        id={student.id}
                        name={student.name}
                        fetcher={fetcher}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </CardContent>
      </Card>

    {addStudentModalOpen && (
  <AddStudentModal
    open={addStudentModalOpen}
    setOpen={setAddStudentModalOpen}
    fetcher={fetcher}
    campuses={campuses}
    streams={streams}
    forms={forms}
  />
)}

      {editStudentModalOpen && selectedStudent && (
        <EditStudentModal
          open={editStudentModalOpen}
          setOpen={setEditStudentModalOpen}
          student={selectedStudent}
          fetcher={fetcher}
        />
      )}

      {assignSubjectsModalOpen && selectedStudent && (
        <AssignSubjectsToStudentModal
          open={assignSubjectsModalOpen}
          setOpen={setAssignSubjectsModalOpen}
          student={selectedStudent}
          availableSubjects={allSubjects}
          assignedSubjects={selectedStudent.subjects || []}
          fetcher={fetcher}
        />
      )}

      <StudentProfilesModal
        student={newStudent}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        showTrigger={false}
        profileTabs={profileTabs}
      />
    </div>
  );
}