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
import { Plus, Search, Pencil, BookOpen, User, MoreVertical, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

// Service imports
import type SubjectService from 'workers/services/subjects';
import type AcademicLevelService from 'workers/services/academic-levels';
import type TeacherService from 'workers/services/teachers';
import type TeacherSubjectService from 'workers/services/teacher-subjects';
import type ClassSubjectService from 'workers/services/class-subjects';
import AddSubjectModal from '~/components/modal/AddSubjectModal';
import EditSubjectModal from '~/components/modal/EditSubjectModal';
import AssignTeachersModal from '~/components/modal/AssignTeachersModal';
import ViewSubjectModal from '~/components/modal/ViewSubjectModal';

const UNASSIGNED_TEACHERS_LABEL = 'Not Assigned';

function readOptionalTeacherId(
  raw: FormDataEntryValue | null,
): number | undefined {
  const value = String(raw ?? '').trim();
  if (!value || value === 'none') {
    return undefined;
  }

  const teacherId = Number(value);
  if (!Number.isInteger(teacherId) || teacherId < 1) {
    return undefined;
  }

  return teacherId;
}
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
    academicLevel: AcademicLevelService;
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

  const streams = await services.academicLevel.getAllStreams();

  const teachers = await services.teacher.getAllTeachers({
    limit: 100,
    offset: 0,
    sortBy: 'firstName',
    sortOrder: 'asc',
  });

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
    streams,
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
    if (action === 'assign_teachers') {
      const subjectId = Number(form.get('subjectId'));
      const teacherIds = JSON.parse(String(form.get('teacherIds') || '[]'));

      if (!subjectId) {
        return { error: 'Subject ID is required' };
      }

      const existingTeachers =
        await services.teacherSubject?.getTeachersBySubject(subjectId);

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
      const streamIdRaw = form.get('streamId');
      const streamId = Number(streamIdRaw);

      if (!streamIdRaw || isNaN(streamId) || streamId < 1) {
        return { error: 'Please select a stream for this subject.' };
      }

      const teacherId = readOptionalTeacherId(form.get('teacherId'));

      const data = {
        subjectName: String(form.get('subjectName') ?? ''),
        code: String(form.get('code') ?? ''),
        stream: String(form.get('stream') ?? ''),
        instructor: String(form.get('instructor') ?? ''),
        status: String(form.get('status') ?? '') as 'Active' | 'Inactive',
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        streamId,
      };
      const created = await services.subject.createSubject(data);
      if (!created) {
        return {
          error: 'Failed to create subject. Please check all required fields.',
        };
      }

      // Auto-assign the chosen teacher so they show up under "Assigned Teachers"
      if (teacherId) {
        await services.teacherSubject.assignSubjectToTeacher(teacherId, created.id);
      }

      return { success: true, subject: created };
    }

       if (method === 'PUT') {
      const id = Number(form.get('id'));
      if (!id) return { error: 'Subject ID is required' };

      const teacherId = readOptionalTeacherId(form.get('teacherId'));

      const data = {
        subjectName: String(form.get('subjectName') ?? ''),
        code: String(form.get('code') ?? ''),
        stream: String(form.get('stream') ?? ''),
        instructor: String(form.get('instructor') ?? ''),
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
      };
      const updated = await services.subject.updateSubject(id, data);

      if (teacherId) {
        await services.teacherSubject.assignSubjectToTeacher(teacherId, id);
      }

      return { success: true, subject: updated };
    }

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
    streams,
    allTeachers,
  } = useLoaderData<{
    subjects: any[];
    streams: any[];
    allTeachers: any[];
  }>();
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const listMethod = useFetcher();

  const [subjects, setSubjects] = useState(initialSubjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignTeachersModalOpen, setIsAssignTeachersModalOpen] =
    useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [isViewSubjectModalOpen, setIsViewSubjectModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      lastMethod.current = method ?? fetcher.formMethod;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      fetcher.load(window.location.pathname);
      const data = fetcher.data;

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        return;
      }

      if (data.success) {
        if (data.action === 'assign_teachers') {
          toast.success('Teachers assigned successfully!');
          listMethod.load(window.location.pathname);
          return;
        }

        switch (lastMethod.current) {
          case 'POST':
            toast.success('Subject added successfully!');
            setSubjects((prev) => [...prev, data.subject]);
            listMethod.load(window.location.pathname);
            break;
          case 'PUT':
            toast.success('Subject updated successfully!');
            setSubjects((prev) =>
              prev.map((s) => (s.id === data.subject.id ? data.subject : s))
            );
            listMethod.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.error('Subject deleted successfully!');
            setSubjects((prev) => prev.filter((s) => s.id !== data.id));
            listMethod.load(window.location.pathname);
            break;
          default:
            toast.success('Action completed successfully.');
        }
        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (listMethod.state === 'idle' && listMethod.data?.subjects) {
      setSubjects(listMethod.data.subjects);
    }
  }, [listMethod.state, listMethod.data]);

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

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedSubjectsList,
    startIndex,
    goToPage,
  } = usePagination(filteredSubjects, 10);

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Subject Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-foreground font-medium">
              Manage and organize academic subjects
            </p>
          </div>
          <Button
            onClick={handleOpenAddDialog}
            className="w-full sm:w-auto bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer">
            <Plus className="h-4 w-4" /> Add Subject
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 sm:p-6 border-none shadow-none">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Subjects
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {subjects.length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 sm:p-6 border-none shadow-none">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Active subjects
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {subjects.filter((s) => s.status === 'Active').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 sm:p-6 border-none shadow-none">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total students enrolled
                </p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">
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
        <Card className="p-4 sm:p-6 border-none shadow-none">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search subjects..."
                className="pl-10 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CardContent className="p-0">
            <div className="rounded-md border">
              {/* FIXED: smaller text on mobile, normal size from sm: up */}
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold hidden md:table-cell">
                      Code
                    </TableHead>
                    <TableHead className="font-semibold">
                      Subject Name
                    </TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">
                      Stream
                    </TableHead>
                    <TableHead className="font-semibold">
                      Assigned Teachers
                    </TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">
                      Enrolled Students
                    </TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubjectsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <p className="text-muted-foreground">
                          No subjects found.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSubjectsList.map((subject) => (
                      <TableRow key={subject.id}>
                        {/* Matches hidden header above */}
                        <TableCell className="hidden md:table-cell">
                          {subject.code}
                        </TableCell>
                        <TableCell>{subject.subjectName}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {subject.stream}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            {subject.teachers?.length > 0 ? (
                              subject.teachers.map((teacher: any) => (
                                <Badge
                                  key={teacher.id}
                                  variant="secondary"
                                  className="text-[10px] sm:text-xs"
                                >
                                  {teacher.firstName} {teacher.lastName}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                {UNASSIGNED_TEACHERS_LABEL}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {subject.enrolledStudents || 0}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subject.status === 'Active'
                                ? 'default'
                                : 'outline'
                            }
                            className="text-[10px] sm:text-xs"
                          >
                            {subject.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="hidden lg:flex justify-end gap-2">
                            <Button
                              className="text-gray-600 hover:scale-110 hover:text-blue-600 transition cursor-pointer"
                              variant="ghost"
                              size="icon"
                              title="View Subject"
                              onClick={() => {
                                setSelectedSubject(subject);
                                setIsViewSubjectModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              className="text-gray-600 hover:scale-110 hover:text-red-600 transition cursor-pointer"
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
                              className="text-gray-600 hover:scale-110 hover:text-red-600 transition cursor-pointer"
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
                          </div>

                          <div className="flex lg:hidden justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="cursor-pointer">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedSubject(subject);
                                    setIsViewSubjectModalOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedSubject(subject);
                                    setIsAssignTeachersModalOpen(true);
                                  }}
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  Assign Teachers
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditModalOpen(subject)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(subject)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </Card>
      </div>

      {/* Modals */}
     {isAddModalOpen && (
  <AddSubjectModal
    open={isAddModalOpen}
    setOpen={setIsAddModalOpen}
    fetcher={fetcher}
    streams={streams}
    teachers={allTeachers}
  />
)}

{isViewSubjectModalOpen && selectedSubject && (
  <ViewSubjectModal
    open={isViewSubjectModalOpen}
    setOpen={setIsViewSubjectModalOpen}
    subject={selectedSubject}
  />
)}

{isEditModalOpen && selectedSubject && (
  <EditSubjectModal
    open={isEditModalOpen}
    setOpen={setIsEditModalOpen}
    fetcher={fetcher}
    subject={selectedSubject}
    streams={streams}
    teachers={allTeachers}
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

      {/* NEW: controlled delete confirmation for mobile dropdown */}
      {deleteTarget && (
        <DeleteStudentButton
          id={deleteTarget.id}
          name={deleteTarget.subjectName}
          fetcher={fetcher}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          showTrigger={false}
        />
      )}
    </div>
  );
}
