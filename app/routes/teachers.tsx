import { useEffect, useState } from 'react';
import { useLoaderData, useFetcher } from 'react-router';
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
import { Plus, Search, Pencil, BookOpen } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import type TeacherService from 'workers/services/teachers';
import type SubjectService from 'workers/services/subjects';
import type TeacherSubjectService from 'workers/services/teacher-subjects';
import type TeacherClassService from 'workers/services/teacher-classes';
import type ClassService from 'workers/services/class';
import AddTeacherModal from '~/components/modal/AddTeacherModal';
import EditTeacherModal from '~/components/modal/EditTeacherModal';
import AssignSubjectsModal from '~/components/modal/AssignSubjectsModal';
import AssignClassesToTeacherModal from '~/components/modal/AssignClassesToTeacherModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { TeacherProfileModal } from '~/components/modal/TeacherProfileModal';
import { toast } from 'sonner';
import { PaginationControls } from '~/components/shared/PaginationControls';
import { usePagination } from '~/hooks/usePagination';
import { GraduationCap } from 'lucide-react';

// 🧠 Loader – fetch teachers with their subjects and classes
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    teacher: TeacherService;
    subject: SubjectService;
    teacherSubject: TeacherSubjectService;
    teacherClass: TeacherClassService;
    class: ClassService;
  };

  const teachers = await services.teacher?.getAllTeachers({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });

  // Get all subjects for assignment modal
  const subjects = await services.subject?.getAllSubjects({
    limit: 100,
    offset: 0,
    sortBy: 'subjectName',
    sortOrder: 'asc',
  });

  // Get all classes for assignment modal
  const allClasses = await services.class.getAll({
    limit: 100,
    offset: 0,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Get subjects and classes for each teacher
  const teachersWithSubjectsAndClasses = await Promise.all(
    teachers.map(async (teacher) => {
      const assignedSubjects =
        await services.teacherSubject?.getSubjectsByTeacher(teacher.id);
      const assignedClasses = await services.teacherClass?.getClassesByTeacher(
        teacher.id
      );
      return {
        ...teacher,
        subjects: assignedSubjects || [],
        classes: assignedClasses || [],
      };
    })
  );

  return {
    teachers: teachersWithSubjectsAndClasses,
    allSubjects: subjects,
    allClasses: allClasses,
  };
}

// ⚙️ Action – handle create, update, delete, and subject/class assignments
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as {
    teacher: TeacherService;
    teacherSubject: TeacherSubjectService;
    teacherClass: TeacherClassService;
  };
  const form = await request.formData();

  const method = (form.get('_method') as string) || request.method;
  const action = form.get('action') as string | null;

  try {
    // --- ASSIGN SUBJECTS TO TEACHER ---
    if (action === 'assign_subjects') {
      const teacherId = Number(form.get('teacherId'));
      const subjectIds = JSON.parse(String(form.get('subjectIds') || '[]'));

      if (!teacherId) {
        return { error: 'Teacher ID is required' };
      }

      await services.teacherSubject?.replaceTeacherSubjects(
        teacherId,
        subjectIds
      );
      return { success: true, action: 'assign_subjects' };
    }

    // --- ASSIGN CLASSES TO TEACHER ---
    if (action === 'assign_classes') {
      const teacherId = Number(form.get('teacherId'));
      const classIds = JSON.parse(String(form.get('classIds') || '[]'));

      if (!teacherId) {
        return { error: 'Teacher ID is required' };
      }

      await services.teacherClass?.replaceTeacherClasses(teacherId, classIds);
      return { success: true, action: 'assign_classes' };
    }
    // --- CREATE TEACHER ---
    if (method === 'POST') {
      const data = {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        subject: String(form.get('subject') ?? ''),
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        address: form.get('address') ? String(form.get('address')) : undefined,
        qualification: form.get('qualification')
          ? String(form.get('qualification'))
          : undefined,
        gender: String(form.get('gender') ?? 'Male') as 'Male' | 'Female',
        experience: form.get('experience')
          ? Number(form.get('experience'))
          : undefined,
        status: String(form.get('status') ?? 'Active') as 'Active' | 'Inactive',
      };

      const created = await services.teacher.createTeacher(data);
      return new Response(JSON.stringify({ success: true, teacher: created }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- UPDATE TEACHER ---
    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Teacher ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data = {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        subject: String(form.get('subject') ?? ''),
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        address: form.get('address') ? String(form.get('address')) : undefined,
        qualification: form.get('qualification')
          ? String(form.get('qualification'))
          : undefined,
        gender: String(form.get('gender') ?? 'Male') as 'Male' | 'Female',
        experience: form.get('experience')
          ? Number(form.get('experience'))
          : undefined,
        status: String(form.get('status') ?? 'Active') as 'Active' | 'Inactive',
      };

      const updated = await services.teacher.updateTeacherById(
        Number(id),
        data
      );
      return { success: true, teacher: updated };
    }

    // --- DELETE TEACHER ---
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Teacher ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await services.teacher.deleteTeacherById(Number(id));
      return { success: true };
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('teachers.action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 🧑‍🏫 UI – Teachers Table & Modals
export default function Teachers() {
  const {
    teachers: initialTeachers,
    allSubjects,
    allClasses,
  } = useLoaderData() as {
    teachers: any[];
    allSubjects: any[];
    allClasses: any[];
  };
  const fetcher = useFetcher();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignSubjectsModalOpen, setAssignSubjectsModalOpen] = useState(false);
  const [assignClassesModalOpen, setAssignClassesModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  const filteredStudents = initialTeachers?.filter((teacher) => {
    const matchesSearch =
      teacher.firstName.toLowerCase().includes(search.toLowerCase()) ||
      teacher.lastName.toLowerCase().includes(search.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      statusFilter === 'all' || teacher.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  //pagination logic
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedStudentsList,
    startIndex,
    goToPage,
  } = usePagination(filteredStudents, 10);

  //use useEffect to show sonner form shardcn as a toast on successful add, edit, delete
  useEffect(() => {
    if (fetcher.data?.success) {
      const method = fetcher.formData?.get('_method');
      const action = fetcher.formData?.get('action');
      let message = '';

      if (action === 'assign_subjects') {
        message = 'Subjects assigned successfully!';
        toast.success(message);
        return;
      }

      if (action === 'assign_classes') {
        message = 'Classes assigned successfully!';
        toast.success(message);
        return;
      }

      switch (method) {
        case 'POST':
          message = 'Teacher added successfully!';
          toast.success(message);
          break;
        case 'PUT':
          message = 'Teacher updated successfully!';
          toast.success(message);
          break;
        case 'DELETE':
          message = 'Teacher deleted successfully!';
          toast.error(message);
          break;
        default:
          toast.success('Action completed successfully.');
      }
    }

    if (fetcher.data?.error) {
      toast.error(fetcher.data.error || 'An unexpected error occurred.');
    }
  }, [fetcher.data]);

  return (
    <div className="space-y-6 h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all teacher records
          </p>
        </div>
        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Teacher
        </Button>
      </div>

      {/* Search & Filter */}
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search teachers..."
                className="pl-10 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
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
                  <TableHead className="font-semibold">
                    Assigned Subjects
                  </TableHead>
                  <TableHead className="font-semibold">
                    Assigned Classes
                  </TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedStudentsList?.map((teacher, index) => (
                  <TableRow key={teacher.id}>
                    <TableCell>{startIndex + index + 1}</TableCell>
                    <TableCell>{teacher.firstName}</TableCell>
                    <TableCell>{teacher.lastName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {teacher.subjects?.length > 0 ? (
                          teacher.subjects.map((subject: any) => (
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
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {teacher.classes?.length > 0 ? (
                          teacher.classes.map((classItem: any) => (
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
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          teacher.status === 'Active' ? 'default' : 'outline'
                        }
                      >
                        {teacher.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <TeacherProfileModal teacher={teacher} />
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Assign Subjects"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setAssignSubjectsModalOpen(true);
                        }}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Assign Classes"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setAssignClassesModalOpen(true);
                        }}
                      >
                        <GraduationCap className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setEditModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteStudentButton
                        id={teacher.id}
                        name={`${teacher.firstName} ${teacher.lastName}`}
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

      {/* Add Modal */}
      {addModalOpen && (
        <AddTeacherModal
          open={addModalOpen}
          setOpen={setAddModalOpen}
          fetcher={fetcher}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedTeacher && (
        <EditTeacherModal
          open={editModalOpen}
          setOpen={setEditModalOpen}
          teacher={selectedTeacher}
          fetcher={fetcher}
        />
      )}

      {/* Assign Subjects Modal */}
      {assignSubjectsModalOpen && selectedTeacher && (
        <AssignSubjectsModal
          open={assignSubjectsModalOpen}
          setOpen={setAssignSubjectsModalOpen}
          teacher={selectedTeacher}
          availableSubjects={allSubjects}
          assignedSubjects={selectedTeacher.subjects || []}
          fetcher={fetcher}
        />
      )}

      {/* Assign Classes Modal */}
      {assignClassesModalOpen && selectedTeacher && (
        <AssignClassesToTeacherModal
          open={assignClassesModalOpen}
          setOpen={setAssignClassesModalOpen}
          teacher={selectedTeacher}
          availableClasses={allClasses}
          assignedClasses={selectedTeacher.classes || []}
          fetcher={fetcher}
        />
      )}
    </div>
  );
}
