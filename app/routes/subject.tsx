import { useEffect, useRef, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useFetcher, useLoaderData } from 'react-router';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Plus, Search, Pencil, Trash2, BookOpen, User } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';

// Service import
import type SubjectService from 'workers/services/subjects';
import type DepartmentService from 'workers/services/departments';
import type TeacherService from 'workers/services/teachers';
import type TeacherSubjectService from 'workers/services/teacher-subjects';
import type ClassSubjectService from 'workers/services/class-subjects';
import AddSubjectModal from '~/components/modal/AddSubjectModal';
import EditSubjectModal from '~/components/modal/EditSubjectModal';
import AssignTeachersModal from '~/components/modal/AssignTeachersModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { PaginationControls } from '~/components/shared/PaginationControls';
import { usePagination } from '~/hooks/usePagination';

//Loader — fetch subjects with their teachers and classes from DB
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    subject: SubjectService;
    department: DepartmentService;
    teacher: TeacherService;
    teacherSubject: TeacherSubjectService;
    classSubject: ClassSubjectService;
  };
  const subjects = await services.subject.getAllSubjects({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });
  const departments = await services.department.getDepartments({
    limit: 100,
    offset: 0,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Get all teachers for assignment modal
  const teachers = await services.teacher.getAllTeachers({
    limit: 100,
    offset: 0,
    sortBy: 'firstName',
    sortOrder: 'asc',
  });

  // Get teachers and classes for each subject
  const subjectsWithTeachersAndClasses = await Promise.all(
    subjects.map(async (subject) => {
      const assignedTeachers =
        await services.teacherSubject?.getTeachersBySubject(subject.id);
      const assignedClasses = await services.classSubject?.getClassesBySubject(
        subject.id
      );
      return {
        ...subject,
        teachers: assignedTeachers || [],
        classes: assignedClasses || [],
      };
    })
  );

  return {
    subjects: subjectsWithTeachersAndClasses,
    departments,
    allTeachers: teachers,
  };
}

// Action — handle create, update, delete, and teacher assignments
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as {
    subject: SubjectService;
    teacherSubject: TeacherSubjectService;
  };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  const action = form.get('action') as string | null;

  try {
    // --- ASSIGN TEACHERS TO SUBJECT ---
    if (action === 'assign_teachers') {
      const subjectId = Number(form.get('subjectId'));
      const teacherIds = JSON.parse(String(form.get('teacherIds') || '[]'));

      if (!subjectId) {
        return { error: 'Subject ID is required' };
      }

      // For subjects, we need to clear old assignments and add new ones
      // First get existing teachers for this subject
      const existingTeachers =
        await services.teacherSubject?.getTeachersBySubject(subjectId);

      // Remove teachers that are no longer assigned
      if (existingTeachers) {
        for (const teacher of existingTeachers) {
          if (!teacherIds.includes(teacher.id)) {
            await services.teacherSubject?.removeSubjectFromTeacher(
              teacher.id,
              subjectId
            );
          }
        }
      }

      // Add new teachers
      for (const teacherId of teacherIds) {
        await services.teacherSubject?.assignSubjectToTeacher(
          teacherId,
          subjectId
        );
      }

      return { success: true, action: 'assign_teachers' };
    }
    // CREATE
    if (method === 'POST') {
      const data = {
        subjectName: String(form.get('subjectName') ?? ''),
        code: String(form.get('code') ?? ''),
        departments: String(form.get('departments') ?? ''),
        instructor: String(form.get('instructor') ?? ''),
        enrolledStudents: Number(form.get('enrolledStudents') ?? 0),
        status: String(form.get('status') ?? '') as 'Active' | 'Inactive',
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        departmentId: Number(form.get('departmentId')),
      };
      const created = await services.subject.createSubject(data);
      if (!created) {
        return {
          error: 'Failed to create subject. Please check all required fields.',
        };
      }
      return { success: true, subject: created };
    }

    // UPDATE
    if (method === 'PUT') {
      const id = Number(form.get('id'));
      if (!id) return { error: 'Subject ID is required' };
      const data = {
        subjectName: String(form.get('subjectName') ?? ''),
        code: String(form.get('code') ?? ''),
        departments: String(form.get('departments') ?? ''),
        instructor: String(form.get('instructor') ?? ''),
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        enrolledStudents: Number(form.get('enrolledStudents') ?? 0),
      };
      const updated = await services.subject.updateSubject(id, data);

      return { success: true, subject: updated };
    }

    // DELETE
    if (method === 'DELETE') {
      const id = Number(form.get('id'));
      if (!id) return { error: 'Subject ID is required' };
      await services.subject.deleteSubject(id);
      return { success: true, id };
    }

    return { error: 'Unknown method' };
  } catch (err: any) {
    console.error('subjects action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

// 🎓 Subject Management Page
export default function SubjectsPage() {
  const {
    subjects: initialSubjects,
    departments,
    allTeachers,
  } = useLoaderData<{
    subjects: any[];
    departments: any[];
    allTeachers: any[];
  }>();
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);

  const [subjects, setSubjects] = useState(initialSubjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignTeachersModalOpen, setIsAssignTeachersModalOpen] =
    useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  // 🧩 Track last method
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      lastMethod.current = method ?? fetcher.formMethod;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // ✅ Toasts + instant state update
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        return;
      }

      if (data.success) {
        // Check for specific action first
        if (data.action === 'assign_teachers') {
          toast.success('Teachers assigned successfully!');
          return;
        }

        switch (lastMethod.current) {
          case 'POST':
            toast.success('Subject added successfully!');
            setSubjects((prev) => [...prev, data.subject]);
            break;
          case 'PUT':
            toast.success('Subject updated successfully!');
            setSubjects((prev) =>
              prev.map((s) => (s.id === data.subject.id ? data.subject : s))
            );
            break;
          case 'DELETE':
            toast.success('Subject deleted successfully!');
            setSubjects((prev) => prev.filter((s) => s.id !== data.id));
            break;
          default:
            toast.success('Action completed successfully.');
        }
        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  // 🔍 Filter + search
  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.instructor || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      s.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleOpenAddDialog = () => setIsAddModalOpen(true);
  const handleEditModalOpen = (subject: any) => {
    setSelectedSubject(subject);
    setIsEditModalOpen(true);
  };

  // --- Pagination logic ---
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedSubjectsList,
    startIndex,
    goToPage,
  } = usePagination(filteredSubjects, 10);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Subject Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and organize academic subjects
            </p>
          </div>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
          >
            <Plus className="h-4 w-4" /> Add Subject
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Subjects
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {subjects.length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active subjects
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {subjects.filter((s) => s.status === 'Active').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total students enrolled
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {subjects.reduce(
                    (acc, s) => acc + (s.enrolledStudents || 0),
                    0
                  )}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search + Table */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">
                      Subject Name
                    </TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">
                      Assigned Teachers
                    </TableHead>
                    <TableHead className="font-semibold">Classes</TableHead>
                    <TableHead className="font-semibold">
                      Enrolled Students
                    </TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubjectsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <p className="text-muted-foreground">
                          No subjects found.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSubjectsList.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell>{subject.code}</TableCell>
                        <TableCell>{subject.subjectName}</TableCell>
                        <TableCell>{subject.departments}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {subject.teachers?.length > 0 ? (
                              subject.teachers.map((teacher: any) => (
                                <Badge
                                  key={teacher.id}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {teacher.firstName} {teacher.lastName}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No teachers
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {subject.classes?.length > 0 ? (
                              subject.classes.map((classItem: any) => (
                                <Badge
                                  key={classItem.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {classItem.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No classes
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{subject.enrolledStudents || 0}</TableCell>
                        <TableCell>{subject.description || '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subject.status === 'Active'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {subject.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Assign Teachers"
                            onClick={() => {
                              setSelectedSubject(subject);
                              setIsAssignTeachersModalOpen(true);
                            }}
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditModalOpen(subject)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <DeleteStudentButton
                            id={subject.id}
                            name={subject.subjectName}
                            fetcher={fetcher}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
        </Card>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddSubjectModal
          open={isAddModalOpen}
          setOpen={setIsAddModalOpen}
          fetcher={fetcher}
          departments={departments}
        />
      )}

      {isEditModalOpen && selectedSubject && (
        <EditSubjectModal
          open={isEditModalOpen}
          setOpen={setIsEditModalOpen}
          fetcher={fetcher}
          subject={selectedSubject}
        />
      )}

      {/* Assign Teachers Modal */}
      {isAssignTeachersModalOpen && selectedSubject && (
        <AssignTeachersModal
          open={isAssignTeachersModalOpen}
          setOpen={setIsAssignTeachersModalOpen}
          subject={selectedSubject}
          availableTeachers={allTeachers}
          assignedTeachers={selectedSubject.teachers || []}
          fetcher={fetcher}
        />
      )}
    </div>
  );
}
