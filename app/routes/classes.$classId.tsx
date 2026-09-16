// app/routes/classes/$classId.tsx
import { useState, useEffect, useRef } from 'react';
import {
  useLoaderData,
  useFetcher,
  useParams,
  Link,
  useRevalidator,
} from 'react-router';
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
import { Plus, Search, Pencil, ArrowBigLeftDash } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

import AddStudentToClassModal from '~/components/modal/AddStudentToClassModal';
import EditStudentModal from '~/components/modal/EditStudentModal';
import { StudentProfilesModal } from '~/components/modal/StudentProfileModal';
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router-dom';
import type StudentService from 'workers/services/student';
import type SubjectService from 'workers/services/subjects';
import type AcademicLevelService from 'workers/services/academic-levels';
import { usePagination } from '~/hooks/usePagination';
import { PaginationControls } from '~/components/shared/PaginationControls';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import AssignSubjectsToFormClassModal from '~/components/modal/AssignSubjectsToFormClassModal';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import type { LevelType } from '~/type/shools';

// Type for enriched form class data
interface EnrichedFormClass {
  id: number;
  name: string;
  formId: number;
  streamId: number;
  levelId: number;
  studentCount: number;
  formName: string;
  formNumber: number;
  streamName: string;
  streamColor: 'science' | 'arts' | 'business';
  levelName: string;
  levelType: LevelType;
}

// --- Loader ---
export async function loader({ params, context }: LoaderFunctionArgs) {
  const { classId } = params;
  const services = context.services as {
    student: StudentService;
    academicLevel: AcademicLevelService;
    subject: SubjectService;
  };

  // Get the form class with details (school format)
  const classInfo = await services.academicLevel.getFormClassByIdWithDetails(
    Number(classId)
  );

  if (!classInfo) {
    throw new Response('Class not found', { status: 404 });
  }

  // Get students for this form class
  const students = await services.student.getByFormClassId(Number(classId));

  // Get all subjects for assignment
  const allSubjects = await services.subject.getAllSubjects({
    limit: 100,
    offset: 0,
    sortBy: 'subjectName',
    sortOrder: 'asc',
  });

  return {
    students,
    classInfo,
    allSubjects,
  };
}

// --- Action ---
export async function action({ request, context, params }: ActionFunctionArgs) {
  const { classId } = params;
  const services = context.services as {
    student: StudentService;
    academicLevel: AcademicLevelService;
  };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  const action = form.get('action') as string | null;

  try {
    // CREATE STUDENT
    if (method === 'POST') {
      const studentData = {
        firstName: String(form.get('firstName') || ''),
        lastName: String(form.get('lastName') || ''),
        gender: String(form.get('gender') || 'Male'),
        status:
          (String(form.get('status')) as 'Active' | 'Pending' | 'Inactive') ||
          'Active',
        formClassId: Number(classId), // Use formClassId for school structure
        dob: form.get('dob') ? String(form.get('dob')) : undefined,
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        enrollmentDate: form.get('enrollmentDate')
          ? String(form.get('enrollmentDate'))
          : undefined,
      };
      const created = await services.student.create(studentData);

      // Update the formClass student count
      if (created) {
        const currentClass = await services.academicLevel.getFormClassById(
          Number(classId)
        );
        if (currentClass) {
          await services.academicLevel.updateFormClass(Number(classId), {
            studentCount: (currentClass.studentCount || 0) + 1,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, student: created }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // UPDATE STUDENT
    if (method === 'PUT') {
      const id = form.get('id') as string;
      const data = Object.fromEntries(form.entries());
      // Ensure formClassId is maintained
      const updated = await services.student.update(id, {
        ...data,
        formClassId: Number(classId),
      });
      return new Response(JSON.stringify({ success: true, student: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // DELETE STUDENT
    if (method === 'DELETE') {
      const id = form.get('id') as string;
      await services.student.delete(id);

      // Update the formClass student count
      const currentClass = await services.academicLevel.getFormClassById(
        Number(classId)
      );
      if (currentClass && currentClass.studentCount > 0) {
        await services.academicLevel.updateFormClass(Number(classId), {
          studentCount: currentClass.studentCount - 1,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // REMOVE STUDENT FROM CLASS
    if (method === 'REMOVE') {
      const id = form.get('id') as string;
      await services.student.update(id, { formClassId: undefined });

      // Update the formClass student count
      const currentClass = await services.academicLevel.getFormClassById(
        Number(classId)
      );
      if (currentClass && currentClass.studentCount > 0) {
        await services.academicLevel.updateFormClass(Number(classId), {
          studentCount: currentClass.studentCount - 1,
        });
      }

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
export default function ClassDetails() {
  const {
    students: initialStudents,
    classInfo,
    allSubjects,
  } = useLoaderData() as {
    students: any[];
    classInfo: EnrichedFormClass;
    allSubjects: any[];
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

  // filtering logic
  const filteredStudents = initialStudents?.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      (student.email &&
        student.email.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || student.status === filter;
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
    if (!fetcher.data || fetcher.data === processedResponseRef.current) return;
    if (fetcher.state !== 'idle') return;

    processedResponseRef.current = fetcher.data;

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
      if (action === 'assign_subjects') {
        toast.success('Subjects assigned successfully!');
      } else if (method === 'POST' || !method) {
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

      revalidator.revalidate();
    }

    if (fetcher.data.error) {
      toast.error(fetcher.data.error || 'An error occurred');
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  return (
    <div className="space-y-2 h-min-screen">
      {/* Back Button */}
      <Link
        to="/classes"
        className="flex items-center gap-2 bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-fit text-sm sm:text-base mb-4"
      >
        <ArrowBigLeftDash className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>Back to Classes</span>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {classInfo?.name}
            </h1>
            <LevelBadge level={classInfo?.levelType} size="md" />
            <StreamBadge stream={classInfo?.streamColor} size="md" />
          </div>
          <p className="text-muted-foreground mt-1">
            {classInfo?.formName} • {classInfo?.streamName} •{' '}
            {classInfo?.levelName}
          </p>
        </div>
        <div className="flex gap-2">
          {/* TODO: will deal with it leter */}
          {/* <Button
            variant="outline"
            className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer hover:text-white"
            onClick={() => setAssignSubjectsModalOpen(true)}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Assign Subjects
          </Button> */}
          <Button
            className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]  hover:scale-110 hover:text-white-600 transition cursor-pointer"
            onClick={() => setAddStudentModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Table */}
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold">SN</TableHead>
                  <TableHead className="font-semibold">First name</TableHead>
                  <TableHead className="font-semibold">Last name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Enrolled</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedStudents?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        No students found. Add your first student to this class.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents?.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell>{student.firstName}</TableCell>
                      <TableCell>{student.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.email || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.phone || '-'}
                      </TableCell>
                      <TableCell>{student.enrollmentDate || '-'}</TableCell>
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
                          size="sm"
                          className=" hover:scale-110 hover:text-white-600 transition cursor-pointer"
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
                  ))
                )}
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
        <AddStudentToClassModal
          open={addStudentModalOpen}
          setOpen={setAddStudentModalOpen}
          classInfo={classInfo}
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
        <AssignSubjectsToFormClassModal
          open={assignSubjectsModalOpen}
          setOpen={setAssignSubjectsModalOpen}
          classInfo={classInfo}
          availableSubjects={allSubjects}
          fetcher={fetcher}
        />
      )}
    </div>
  );
}
