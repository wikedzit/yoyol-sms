// app/routes/classes/$classId.tsx
import { useState, useEffect, useRef } from 'react';
import { useLoaderData, useFetcher, useParams, Link, useRevalidator } from 'react-router';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
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
import { Plus, Search, Pencil, Trash, ArrowBigLeftDash } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

import AddStudentModal from '~/components/modal/AddStudentModal';
import EditStudentModal from '~/components/modal/EditStudentModal';
import { StudentProfilesModal } from '~/components/modal/StudentProfileModal';
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router-dom';
import type StudentService from 'workers/services/student';
import type SubjectService from 'workers/services/subjects';
import type ClassSubjectService from 'workers/services/class-subjects';
import type TeacherClassService from 'workers/services/teacher-classes';
import type TeacherService from 'workers/services/teachers';
import { usePagination } from '~/hooks/usePagination';
import { PaginationControls } from '~/components/shared/PaginationControls';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import AssignSubjectsToClassModal from '~/components/modal/AssignSubjectsToClassModal';
import AssignTeachersToClassModal from '~/components/modal/AssignTeachersToClassModal';
import { BookOpen, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

// --- Loader ---
export async function loader({ params, context }: LoaderFunctionArgs) {
  const { classId } = params;
  const services = context.services as {
    student: StudentService;
    class: any;
    subject: SubjectService;
    classSubject: ClassSubjectService;
    teacherClass: TeacherClassService;
    teacher: TeacherService;
  };
  const students = await services.student.getAll({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });
  // Filter students belonging to this class
  const filtered = students.filter((s) => s.classId === Number(classId));
  //capture the class details
  const classInfo = await services.class.getById(Number(classId));

  // Get all subjects
  const allSubjects = await services.subject.getAllSubjects({
    limit: 100,
    offset: 0,
    sortBy: 'subjectName',
    sortOrder: 'asc',
  });

  // Get all teachers
  const allTeachers = await services.teacher.getAllTeachers({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });

  // Get subjects assigned to this class
  const assignedSubjects = await services.classSubject.getSubjectsByClass(
    Number(classId)
  );

  // Get teachers assigned to this class
  const assignedTeachers = await services.teacherClass.getTeachersByClass(
    Number(classId)
  );

  return {
    students: filtered,
    class: classInfo,
    allSubjects,
    assignedSubjects,
    allTeachers,
    assignedTeachers,
  };
}

// --- Action ---
export async function action({ request, context, params }: ActionFunctionArgs) {
  const { classId } = params;
  const services = context.services as {
    student: StudentService;
    classSubject: ClassSubjectService;
    teacherClass: TeacherClassService;
  };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  const action = form.get('action') as string | null;

  try {
    // --- ASSIGN SUBJECTS TO CLASS ---
    if (action === 'assign_subjects') {
      const formClassId = Number(form.get('classId'));
      const subjectIds = JSON.parse(String(form.get('subjectIds') || '[]'));

      if (!formClassId) {
        return new Response(JSON.stringify({ error: 'Class ID is required' }), {
          status: 400,
        });
      }

      // Replace all subject assignments for this class
      await services.classSubject.replaceClassSubjects(formClassId, subjectIds);

      return new Response(
        JSON.stringify({ success: true, action: 'assign_subjects' }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // --- ASSIGN TEACHERS TO CLASS ---
    if (action === 'assign_teachers') {
      const formClassId = Number(form.get('classId'));
      const teacherIds = JSON.parse(String(form.get('teacherIds') || '[]'));

      if (!formClassId) {
        return new Response(JSON.stringify({ error: 'Class ID is required' }), {
          status: 400,
        });
      }

      // Replace all teacher assignments for this class
      await services.teacherClass.replaceClassTeachers(formClassId, teacherIds);

      return new Response(
        JSON.stringify({ success: true, action: 'assign_teachers' }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (method === 'POST') {
      // Ensure classId is always a valid number or undefined
      const rawClassId = form.get('classId') ?? classId;
      const parsedClassId =
        rawClassId !== undefined && rawClassId !== null && rawClassId !== ''
          ? Number(rawClassId)
          : undefined;

      // CREATE student in this class
      const studentData = {
        firstName: String(form.get('firstName') || ''),
        lastName: String(form.get('lastName') || ''),
        gender: String(form.get('gender') || 'Other'),
        status:
          (String(form.get('status')) as 'Active' | 'Pending' | 'Inactive') ||
          'Active',
        classId: parsedClassId,
        dob: form.get('dob') ? String(form.get('dob')) : undefined,
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        course: form.get('course') ? String(form.get('course')) : undefined,
        grade: form.get('grade') ? String(form.get('grade')) : undefined,
        enrollmentDate: form.get('enrollmentDate')
          ? String(form.get('enrollmentDate'))
          : undefined,
      };
      const created = await services.student.create(studentData);
      return new Response(JSON.stringify({ success: true, student: created }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT') {
      // UPDATE student
      const id = form.get('id') as string;
      const data = Object.fromEntries(form.entries());
      const updated = await services.student.update(id, {
        ...data,
        classId: Number(classId),
      });
      return new Response(JSON.stringify({ success: true, student: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE') {
      const id = form.get('id') as string;
      await services.student.delete(id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'REMOVE') {
      // Remove from class without deleting
      const id = form.get('id') as string;
      // set classId to undefined to clear the association (matches z.number().optional() type)
      await services.student.update(id, { classId: undefined });
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
    });
  } catch (err: any) {
    console.error('ClassDetails.action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500 }
    );
  }
}

// --- Component ---
export default function ClassDetails({ params }: { params: any }) {
  const {
    students: initialStudents,
    class: classInfo,
    allSubjects,
    assignedSubjects,
    allTeachers,
    assignedTeachers,
  } = useLoaderData() as {
    students: any[];
    class: any;
    allSubjects: any[];
    assignedSubjects: any[];
    allTeachers: any[];
    assignedTeachers: any[];
  };
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const { classId } = useParams();
  const processedResponseRef = useRef<any>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [editStudentModalOpen, setEditStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [assignSubjectsModalOpen, setAssignSubjectsModalOpen] = useState(false);
  const [assignTeachersModalOpen, setAssignTeachersModalOpen] = useState(false);

  // filtering logic
  const filteredStudents = initialStudents?.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      (student.email &&
        student.email.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter =
      filter === 'all' || student.course === filter || student.grade === filter;
    return matchesSearch && matchesFilter;
  });

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedStudents,
    startIndex,
    goToPage,
  } = usePagination(filteredStudents, 10);

  // Unified toast notification handler
  useEffect(() => {
    // Skip if no data or if we've already processed this response
    if (!fetcher.data || fetcher.data === processedResponseRef.current) return;
    
    // Only process when fetcher is in idle state (submission complete)
    if (fetcher.state !== 'idle') return;

    // Mark this response as processed
    processedResponseRef.current = fetcher.data;

    // Get action and method from formData
    let action: string | null = null;
    let method: string | null = null;
    
    try {
      const formData: any = fetcher.formData;
      action = (formData?.get?.('action') as string) || null;
      method = (formData?.get?.('_method') as string) || null;
    } catch {
      // Ignore errors if formData is not available
    }

    if (fetcher.data.success) {
      // Handle different actions
      if (action === 'assign_subjects') {
        toast.success('Subjects assigned successfully!');
        // Modal closes itself in the component
      } else if (action === 'assign_teachers') {
        toast.success('Teachers assigned successfully!');
        // Modal closes itself in the component
      } else if (method === 'POST' || !method) {
        // POST or no method means adding a student
        toast.success('Student added successfully!');
        setAddStudentModalOpen(false);
      } else if (method === 'PUT') {
        toast.success('Student updated successfully!');
        setEditStudentModalOpen(false);
      } else if (method === 'DELETE') {
        toast.success('Student deleted successfully!');
      } else if (method === 'REMOVE') {
        toast.success('Student removed from class successfully!');
      }

      // Revalidate route data to refresh the UI
      revalidator.revalidate();
    }

    if (fetcher.data.error) {
      toast.error(fetcher.data.error || 'An error occurred');
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  return (
    <div className="space-y-2 min-h-screen w-full overflow-y-auto p-2 sm:p-4">
      {/* Back Button */}
      <Link
        to={classId ? `/classes` : ''}
        className="flex items-center gap-2 bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-fit text-sm sm:text-base"
      >
        <ArrowBigLeftDash className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>
          {classId ? 'Back to Classes' : 'Back to Department Classes'}
        </span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {classInfo?.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage students, subjects, and teachers in this class
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="bg-primary-gradient text-white py-2 px-3 sm:px-4 rounded-[8px] text-sm sm:text-base hover:text-white"
            onClick={() => setAssignSubjectsModalOpen(true)}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Assign Subjects
          </Button>
          <Button
            variant="outline"
            className="bg-primary-gradient text-white py-2 px-3 sm:px-4 rounded-[8px] text-sm sm:text-base hover:text-white"
            onClick={() => setAssignTeachersModalOpen(true)}
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Assign Teachers
          </Button>
          <Button
            className="bg-primary-gradient text-white py-2 px-3 sm:px-4 rounded-[8px] text-sm sm:text-base"
            onClick={() => setAddStudentModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Assigned Subjects */}
      {assignedSubjects.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Assigned Subjects</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {assignedSubjects.map((subject: any) => (
                <Badge key={subject.id} variant="secondary" className="text-sm">
                  {subject.subjectName} ({subject.code})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Teachers */}
      {assignedTeachers.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Assigned Teachers</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {assignedTeachers.map((teacher: any) => (
                <Badge key={teacher.id} variant="outline" className="text-sm">
                  {teacher.firstName} {teacher.lastName}
                  {teacher.email && (
                    <span className="text-muted-foreground ml-1 text-xs sm:text-sm">
                      ({teacher.email})
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10 bg-muted/50 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by course/grade" />
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

        {/* Students Table (responsive) */}
        <CardContent className="overflow-x-auto">
          <div className="min-w-[700px] sm:min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SN</TableHead>
                  <TableHead>First name</TableHead>
                  <TableHead>Last name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedStudents?.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell>{startIndex + index + 1}</TableCell>
                    <TableCell>{student.firstName}</TableCell>
                    <TableCell>{student.lastName}</TableCell>
                    <TableCell className="truncate max-w-[150px] sm:max-w-none text-muted-foreground">
                      {student.email}
                    </TableCell>
                    <TableCell>{student.course}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-none">
                        {student.grade}
                      </Badge>
                    </TableCell>
                    <TableCell>{student.enrollmentDate}</TableCell>
                    <TableCell>
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
                    <TableCell className="flex justify-end gap-2">
                      <StudentProfilesModal student={student} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student);
                          setEditStudentModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteStudentButton
                        id={student.id}
                        name={`${student.firstName} ${student.lastName}`}
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

      {/* Modals */}
      {addStudentModalOpen && (
        <AddStudentModal
          open={addStudentModalOpen}
          setOpen={setAddStudentModalOpen}
          classId={classId}
          fetcher={fetcher}
        />
      )}
      {editStudentModalOpen && selectedStudent && (
        <EditStudentModal
          open={editStudentModalOpen}
          setOpen={setEditStudentModalOpen}
          student={selectedStudent}
          classId={classId}
          fetcher={fetcher}
        />
      )}
      {assignSubjectsModalOpen && classInfo && (
        <AssignSubjectsToClassModal
          open={assignSubjectsModalOpen}
          setOpen={setAssignSubjectsModalOpen}
          classData={classInfo}
          availableSubjects={allSubjects}
          assignedSubjects={assignedSubjects}
          fetcher={fetcher}
        />
      )}
      {assignTeachersModalOpen && classInfo && (
        <AssignTeachersToClassModal
          open={assignTeachersModalOpen}
          setOpen={setAssignTeachersModalOpen}
          classData={classInfo}
          availableTeachers={allTeachers}
          assignedTeachers={assignedTeachers}
          fetcher={fetcher}
        />
      )}
    </div>
  );
}
