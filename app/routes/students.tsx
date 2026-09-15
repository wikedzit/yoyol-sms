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

// 🧠 Loader – fetch students with their assigned subjects + schools + campuses
export async function loader({ context }: LoaderFunctionArgs) {
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

  return {
    students: studentsWithSubjects,
    allSubjects: subjects,
    schools,
    campuses,
    defaultSchoolId,
    streams,
    forms,
  };
}
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as {
    student: StudentService;
    studentSubjects: StudentSubjectService;
    school: SchoolService;
    campus: CampusService;
  };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  const action = form.get('action') as string | null;

  try {
    if (action === 'assign_subjects') {
      const studentId = Number(form.get('studentId'));
      const subjectIds = JSON.parse(String(form.get('subjectIds') || '[]'));

      if (!studentId) {
        return { error: 'Student ID is required' };
      }

      await services.studentSubjects?.replaceStudentSubjects(
        studentId,
        subjectIds
      );
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
        return new Response(
          JSON.stringify({
            error: 'No school found. Please register a school first.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const data = {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        gender: String(form.get('gender') ?? 'Select gender') as
          | 'Male'
          | 'Female',
        dob: String(form.get('dob') ?? ''),
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        address: form.get('address') ? String(form.get('address')) : undefined,
        guardianName: form.get('guardianName')
          ? String(form.get('guardianName'))
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
        schoolId: String(schoolId),
        campusId: campusId ? String(campusId) : undefined,
        status: String(form.get('status') ?? 'Active') as
          | 'Active'
          | 'Pending'
          | 'Inactive',
      };

      const created = await services.student.create(data);

      if (!created) {
        return new Response(
          JSON.stringify({
            error: 'Failed to add student. Please try again.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, student: created }), {
        headers: { 'Content-Type': 'application/json' },
      });
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
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        gender: String(form.get('gender') ?? 'Select gender') as
          | 'Male'
          | 'Female',
        dob: String(form.get('dob') ?? ''),
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        address: form.get('address') ? String(form.get('address')) : undefined,
        guardianName: form.get('guardianName')
          ? String(form.get('guardianName'))
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
        status: String(form.get('status') ?? 'Active') as
          | 'Active'
          | 'Pending'
          | 'Inactive',
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
  } catch (err: any) {
    console.error('students.action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
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
} = useLoaderData() as {
  students: any[];
  allSubjects: any[];
  schools: any[];
  campuses: any[];
  defaultSchoolId: number | null;
  streams: any[];
  forms: any[];
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
      student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());
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
    <div className="space-y-6 min-h-screen p-4 md:p-6 lg:p-8 bg-background">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and view all student records
          </p>
        </div>
        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-all sm:w-auto w-full"
          onClick={() => setAddStudentModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('addStudent')}
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('searchStudents')}
                className="pl-10 w-full bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
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
          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">SN</TableHead>
                  <TableHead className="font-semibold">{t('firstName')}</TableHead>
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
                    <TableCell>{student.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {student.subjects?.length > 0 ? (
                          student.subjects.map((subject: any) => (
                            <Badge
                              key={subject.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {subject.code}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No subjects
                          </span>
                        )}
                      </div>
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
                      <StudentProfilesModal student={student} />
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Assign Subjects"
                        className="hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedStudent(student);
                          setAssignSubjectsModalOpen(true);
                        }}
                      >
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedStudent(student);
                          setEditStudentModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
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

          {/* Mobile/Tablet Card View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {paginatedStudentsList?.map((student, index) => (
              <div key={student.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-start gap-3">
                    <span className="font-semibold text-lg leading-none">
                      {student.firstName} {student.lastName}
                    </span>
                    <Badge
                      variant={
                        student.status === 'Active'
                          ? 'default'
                          : student.status === 'Pending'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="shrink-0 mt-0.5"
                    >
                      {student.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground truncate">
                    {student.email}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                  <div>
                    <span className="text-muted-foreground">{t('enrolled')}: </span>
                    <span className="font-medium">{student.enrollmentDate}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-sm">
                  <span className="text-muted-foreground">{t('assignedSubjects')}:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {student.subjects?.length > 0 ? (
                      student.subjects.map((subject: any) => (
                        <Badge
                          key={subject.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {subject.code}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No subjects
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-3 border-t">
                  <StudentProfilesModal student={student} />
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Assign Subjects"
                    className="hover:bg-muted transition-colors h-8 w-8"
                    onClick={() => {
                      setSelectedStudent(student);
                      setAssignSubjectsModalOpen(true);
                    }}
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted transition-colors h-8 w-8"
                    onClick={() => {
                      setSelectedStudent(student);
                      setEditStudentModalOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <DeleteStudentButton
                    id={student.id}
                    name={student.name}
                    fetcher={fetcher}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
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
      />
    </div>
  );
}