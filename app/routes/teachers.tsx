import { useEffect, useRef, useState } from 'react';
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
import { Plus, Search, Pencil, BookOpen, Feather, MoreVertical, Eye } from 'lucide-react';
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
import type AcademicLevelService from 'workers/services/academic-levels';
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

import { toTitleCase } from '~/utils/strings';
// Loader – fetch teachers with their subjects and classes
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

// 🧠 Loader – fetch teachers with their subjects and classes
export async function loader({ context }: LoaderFunctionArgs) { 
  const services = context.services as { 
    teacher: TeacherService; 
    subject: SubjectService; 
    teacherSubject: TeacherSubjectService; 
    teacherClass: TeacherClassService; 
    academicLevel: AcademicLevelService; 
  }; 
 
  const teachers = await services.teacher?.getAllTeachers({ 
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
 
  const allClasses = await services.academicLevel.getAllFormClasses();
 
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

    if (action === 'assign_classes') {
      const teacherId = Number(form.get('teacherId'));
      const classIds = JSON.parse(String(form.get('classIds') || '[]'));

      if (!teacherId) {
        return { error: 'Teacher ID is required' };
      }

      await services.teacherClass?.replaceTeacherClasses(teacherId, classIds);
      return { success: true, action: 'assign_classes' };
    }

    if (method === 'POST') {
      const data = {
        firstName: toTitleCase(String(form.get('firstName') ?? '')),
        lastName: toTitleCase(String(form.get('lastName') ?? '')),
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
      const subjectIds = JSON.parse(String(form.get('subjectIds') || '[]'));
      if (created && Array.isArray(subjectIds)) {
        await services.teacherSubject?.replaceTeacherSubjects(
          created.id,
          subjectIds.map(Number).filter((id: number) => Number.isInteger(id))
        );
      }
      return new Response(JSON.stringify({ success: true, teacher: created }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Teacher ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data = {
        firstName: toTitleCase(String(form.get('firstName') ?? '')),
        lastName: toTitleCase(String(form.get('lastName') ?? '')),
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
  const listFetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>(initialTeachers || []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignSubjectsModalOpen, setAssignSubjectsModalOpen] = useState(false);
  const [assignClassesModalOpen, setAssignClassesModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  // added state to hold the newly added teacher for the profile modal
  const [newTeacher, setNewTeacher] = useState<any>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  // NEW: controlled delete target for the mobile dropdown menu
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  // NEW: controlled profile view target for the mobile dropdown menu
  const [viewTarget, setViewTarget] = useState<any>(null);

  useEffect(() => {
    setTeachers(initialTeachers || []);
  }, [initialTeachers]);

  useEffect(() => {
    if (listFetcher.data?.teachers) {
      setTeachers(listFetcher.data.teachers);
    }
  }, [listFetcher.data]);

  const filteredStudents = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.firstName.toLowerCase().includes(search.toLowerCase()) ||
      teacher.lastName.toLowerCase().includes(search.toLowerCase()) ||
      teacher.subject.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      statusFilter === 'all' || teacher.status === statusFilter;
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
      const method =
        ((fetcher.formData.get('_method') as string) || null) ?? null;
      lastMethod.current = method ?? (fetcher.formMethod || null);
    }
  }, [fetcher.formData, fetcher.state, fetcher.formMethod]);
   // updated to use the new controlled modal approach for TeacherProfileModal
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const data = fetcher.data;

    // Refresh list in background
    listFetcher.load(window.location.pathname);

    if (data.error) {
      toast.error(data.error || 'An error occurred.');
      lastMethod.current = null;
      return;
    }

    if (data.success) {
      if (data.action === 'assign_subjects') {
        toast.success('Subjects assigned successfully!');
        lastMethod.current = null;
        return;
      }

      if (data.action === 'assign_classes') {
        toast.success('Classes assigned successfully!');
        lastMethod.current = null;
        return;
      }

      switch (lastMethod.current) {
        case 'POST':
          // added logic to set the new teacher and open the profile modal after adding a teacher
          if (data.teacher) {
            setNewTeacher(data.teacher);
            setAddModalOpen(false);
            setProfileModalOpen(true);
            toast.success('Teacher added successfully!');
          }
          break;

        case 'PUT':
          toast.success('Teacher updated successfully!');
          if (data.teacher) {
            setTeachers((prev) =>
              prev.map((t) => (t.id === data.teacher.id ? data.teacher : t))
            );
          }
          break;

        case 'DELETE':
          toast.error('Teacher deleted successfully!');
          if (data.id) {
            setTeachers((prev) => prev.filter((t) => t.id !== data.id));
          }
          break;
      }

      lastMethod.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="space-y-6 h-screen overflow-y-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Teachers
          </h1>
          <p className="text-foreground text-xs sm:text-sm font-medium mt-1">
            Manage and view all teacher records
          </p>
        </div>
        <Button
          className="w-full sm:w-auto bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer"
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
              <SelectTrigger className="w-full md:w-[200px]">
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
            {/* FIXED: smaller text on mobile, normal from sm: up */}
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold hidden md:table-cell">SN</TableHead>
                  <TableHead className="font-semibold">First name</TableHead>
                  <TableHead className="font-semibold">Last name</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">
                    Assigned Subjects
                  </TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">
                    Assigned Classes
                  </TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Email</TableHead>
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
                    <TableCell className="hidden md:table-cell">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell>{teacher.firstName}</TableCell>
                    <TableCell>{teacher.lastName}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2 flex-wrap">
                        {teacher.subjects?.length > 0 ? (
                          teacher.subjects.map((subject: any) => (
                            <Badge
                              key={subject.id}
                              variant="secondary"
                              className="text-xs"
                            >
                               {subject.subjectName}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No subjects
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
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
                    <TableCell className="hidden md:table-cell">{teacher.email}</TableCell>
                    <TableCell>{teacher.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          teacher.status === 'Active' ? 'default' : 'outline'
                        }
                        className="text-[10px] sm:text-xs"
                      >
                        {teacher.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="hidden lg:flex justify-end gap-2">
                        <TeacherProfileModal teacher={teacher} />
                        <Button
                          className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
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
                          className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
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
                          className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
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
                      </div>

                      <div className="flex lg:hidden justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewTarget(teacher)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTeacher(teacher);
                                setAssignSubjectsModalOpen(true);
                              }}
                            >
                              <BookOpen className="mr-2 h-4 w-4" />
                              Assign Subjects
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTeacher(teacher);
                                setAssignClassesModalOpen(true);
                              }}
                            >
                              <GraduationCap className="mr-2 h-4 w-4" />
                              Assign Classes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTeacher(teacher);
                                setEditModalOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(teacher)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
          subjects={allSubjects}
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
      
      <TeacherProfileModal
        teacher={newTeacher}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        showTrigger={false}
      />

      {/* NEW: mobile dropdown "View Profile" target */}
      {viewTarget && (
        <TeacherProfileModal
          teacher={viewTarget}
          open={!!viewTarget}
          onOpenChange={(open: boolean) => !open && setViewTarget(null)}
          showTrigger={false}
        />
      )}

      {/* NEW: controlled delete confirmation for mobile dropdown */}
      {deleteTarget && (
        <DeleteStudentButton
          id={deleteTarget.id}
          name={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          fetcher={fetcher}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          showTrigger={false}
        />
      )}
    </div>
  );
}