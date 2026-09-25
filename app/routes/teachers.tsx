import { useEffect, useRef, useState } from 'react';
import {
  useLoaderData,
  useFetcher,
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

import {
  Plus,
  Search,
  Pencil,
  BookOpen,
  GraduationCap,
  MoreVertical,
  Eye,
} from 'lucide-react';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from 'react-router';

import type TeacherService from 'workers/services/teachers';
import type SubjectService from 'workers/services/subjects';
import type TeacherSubjectService from 'workers/services/teacher-subjects';
import type TeacherClassService from 'workers/services/teacher-classes';
import type ClassService from 'workers/services/class';
import type CampusService from 'workers/services/campus';
import type SchoolService from 'workers/services/school';

import AddTeacherModal from '~/components/modal/AddTeacherModal';
import EditTeacherModal from '~/components/modal/EditTeacherModal';
import AssignSubjectsModal from '~/components/modal/AssignSubjectsModal';
import AssignClassesToTeacherModal from '~/components/modal/AssignClassesToTeacherModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { TeacherProfileModal } from '~/components/modal/TeacherProfileModal';

import { toast } from 'sonner';

import { PaginationControls } from '~/components/shared/PaginationControls';
import { usePagination } from '~/hooks/usePagination';

import { toTitleCase } from '~/utils/strings';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

export async function loader({
  context,
}: LoaderFunctionArgs) {
  const services = context.services as {
    teacher: TeacherService;
    subject: SubjectService;
    teacherSubject: TeacherSubjectService;
    teacherClass: TeacherClassService;
    class: ClassService;
    campus: CampusService;
    school: SchoolService;
  };

  // ------------------------------------------------
  // Teachers
  // ------------------------------------------------

  const teachers =
    await services.teacher?.getAllTeachers({
      limit: 100,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

  // ------------------------------------------------
  // Subjects
  // ------------------------------------------------

  const subjects =
    await services.subject?.getAllSubjects({
      limit: 100,
      offset: 0,
      sortBy: 'subjectName',
      sortOrder: 'asc',
    });

  // ------------------------------------------------
  // Classes
  // ------------------------------------------------

  const allClasses =
    await services.class.getAll({
      limit: 100,
      offset: 0,
      sortBy: 'name',
      sortOrder: 'asc',
    });

  // ------------------------------------------------
  // School
  // ------------------------------------------------

  const schools =
    await services.school.getAll();

  const school =
    schools[0] ?? null;

  // ------------------------------------------------
  // Campuses
  // ------------------------------------------------

  const campuses = school
    ? await services.campus.getBySchoolId(
        school.id
      )
    : [];

  // ------------------------------------------------
  // Teachers with subjects/classes
  // ------------------------------------------------

  const teachersWithSubjectsAndClasses =
    await Promise.all(
      (teachers || []).map(
        async (teacher) => {
          const assignedSubjects =
            await services.teacherSubject?.getSubjectsByTeacher(
              teacher.id
            );

          const assignedClasses =
            await services.teacherClass?.getClassesByTeacher(
              teacher.id
            );

          return {
            ...teacher,
            subjects:
              assignedSubjects || [],
            classes:
              assignedClasses || [],
          };
        }
      )
    );

  return {
    teachers:
      teachersWithSubjectsAndClasses,

    allSubjects:
      subjects || [],

    allClasses:
      allClasses || [],

    campuses:
      campuses || [],
  };
}

// --------------------------------------------------
// Action
// --------------------------------------------------

export async function action({
  request,
  context,
}: ActionFunctionArgs) {
  const services = context.services as {
    teacher: TeacherService;
    teacherSubject: TeacherSubjectService;
    teacherClass: TeacherClassService;
  };

  const form =
    await request.formData();

  const method =
    (form.get('_method') as string) ||
    request.method;

  const action =
    form.get('action') as string | null;

  try {
    // ------------------------------------------------
    // Assign subjects
    // ------------------------------------------------

    if (
      action === 'assign_subjects'
    ) {
      const teacherId = Number(
        form.get('teacherId')
      );

      const subjectIds =
        JSON.parse(
          String(
            form.get('subjectIds') ||
              '[]'
          )
        );

      if (!teacherId) {
        return new Response(
          JSON.stringify({
            error:
              'Teacher ID is required',
          }),
          {
            status: 400,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      await services.teacherSubject?.replaceTeacherSubjects(
        teacherId,
        Array.isArray(subjectIds)
          ? subjectIds
              .map(Number)
              .filter(
                (id: number) =>
                  Number.isInteger(id)
              )
          : []
      );

      return {
        success: true,
        action: 'assign_subjects',
      };
    }

    // ------------------------------------------------
    // Assign classes
    // ------------------------------------------------

    if (
      action === 'assign_classes'
    ) {
      const teacherId = Number(
        form.get('teacherId')
      );

      const classIds =
        JSON.parse(
          String(
            form.get('classIds') ||
              '[]'
          )
        );

      if (!teacherId) {
        return new Response(
          JSON.stringify({
            error:
              'Teacher ID is required',
          }),
          {
            status: 400,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      await services.teacherClass?.replaceTeacherClasses(
        teacherId,
        Array.isArray(classIds)
          ? classIds
              .map(Number)
              .filter(
                (id: number) =>
                  Number.isInteger(id)
              )
          : []
      );

      return {
        success: true,
        action: 'assign_classes',
      };
    }

    // ------------------------------------------------
    // Create teacher
    // ------------------------------------------------

    if (method === 'POST') {
      const campusId = Number(
        form.get('campusId')
      );

      if (!campusId) {
        return new Response(
          JSON.stringify({
            error:
              'Please select a campus',
          }),
          {
            status: 400,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      const data = {
        firstName: toTitleCase(
          String(
            form.get('firstName') ?? ''
          )
        ),

        lastName: toTitleCase(
          String(
            form.get('lastName') ?? ''
          )
        ),

        subject: String(
          form.get('subject') ?? ''
        ),

        email: form.get('email')
          ? String(
              form.get('email')
            )
          : undefined,

        phone: form.get('phone')
          ? String(
              form.get('phone')
            )
          : undefined,

        address: form.get('address')
          ? String(
              form.get('address')
            )
          : undefined,

        qualification: form.get(
          'qualification'
        )
          ? String(
              form.get(
                'qualification'
              )
            )
          : undefined,

        gender: String(
          form.get('gender') ??
            'Male'
        ) as
          | 'Male'
          | 'Female',

        experience: form.get(
          'experience'
        )
          ? Number(
              form.get(
                'experience'
              )
            )
          : undefined,

        status: String(
          form.get('status') ??
            'Active'
        ) as
          | 'Active'
          | 'Inactive',

        campusId,
      };

      const created =
        await services.teacher.createTeacher(
          data
        );

      const subjectIds =
        JSON.parse(
          String(
            form.get('subjectIds') ||
              '[]'
          )
        );

      const selectedSubjectIds =
        Array.isArray(subjectIds)
          ? subjectIds
              .map(Number)
              .filter(
                (id: number) =>
                  Number.isInteger(id)
              )
          : [];

      if (created) {
        await services.teacherSubject?.replaceTeacherSubjects(
          created.id,
          selectedSubjectIds
        );
      }

      // The profile card reads teacher.subjects, not the legacy subject text.
      const assignedSubjects =
        created
          ? (await services.teacherSubject?.getSubjectsByTeacher(
              created.id
            )) ?? []
          : [];

      return new Response(
        JSON.stringify({
          success: true,
          teacher: created
            ? {
                ...created,
                subjects:
                  assignedSubjects,
              }
            : created,
        }),
        {
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );
    }

    // ------------------------------------------------
    // Update teacher
    // ------------------------------------------------

    if (method === 'PUT') {
      const id =
        form.get('id');

      if (!id) {
        return new Response(
          JSON.stringify({
            error:
              'Teacher ID required',
          }),
          {
            status: 400,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      const campusIdValue =
        form.get('campusId');

      const data = {
        firstName: toTitleCase(
          String(
            form.get('firstName') ?? ''
          )
        ),

        lastName: toTitleCase(
          String(
            form.get('lastName') ?? ''
          )
        ),

        subject: String(
          form.get('subject') ?? ''
        ),

        email: form.get('email')
          ? String(
              form.get('email')
            )
          : undefined,

        phone: form.get('phone')
          ? String(
              form.get('phone')
            )
          : undefined,

        address: form.get('address')
          ? String(
              form.get('address')
            )
          : undefined,

        qualification: form.get(
          'qualification'
        )
          ? String(
              form.get(
                'qualification'
              )
            )
          : undefined,

        gender: String(
          form.get('gender') ??
            'Male'
        ) as
          | 'Male'
          | 'Female',

        experience: form.get(
          'experience'
        )
          ? Number(
              form.get(
                'experience'
              )
            )
          : undefined,

        status: String(
          form.get('status') ??
            'Active'
        ) as
          | 'Active'
          | 'Inactive',

        campusId:
          campusIdValue
            ? Number(
                campusIdValue
              )
            : undefined,
      };

      const updated =
        await services.teacher.updateTeacherById(
          Number(id),
          data
        );

      return {
        success: true,
        teacher: updated,
      };
    }

    // ------------------------------------------------
    // Delete teacher
    // ------------------------------------------------

    if (method === 'DELETE') {
      const id =
        form.get('id');

      if (!id) {
        return new Response(
          JSON.stringify({
            error:
              'Teacher ID required',
          }),
          {
            status: 400,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }

      await services.teacher.deleteTeacherById(
        Number(id)
      );

      return {
        success: true,
        id: Number(id),
      };
    }

    return new Response(
      JSON.stringify({
        error:
          'Unknown method',
      }),
      {
        status: 400,
        headers: {
          'Content-Type':
            'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error(
      'teachers.action error:',
      err
    );

    return new Response(
      JSON.stringify({
        error:
          err?.message ||
          'Server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type':
            'application/json',
        },
      }
    );
  }
}

// --------------------------------------------------
// UI
// --------------------------------------------------

export default function Teachers() {
  const {
    teachers: initialTeachers,
    allSubjects,
    allClasses,
    campuses = [],
  } = useLoaderData() as {
    teachers: any[];
    allSubjects: any[];
    allClasses: any[];
    campuses?: any[];
  };

  const fetcher =
    useFetcher();

  const listFetcher =
    useFetcher();

  const lastMethod =
    useRef<string | null>(
      null
    );

  // ------------------------------------------------
  // State
  // ------------------------------------------------

  const [teachers, setTeachers] =
    useState<any[]>(
      initialTeachers || []
    );

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [addModalOpen, setAddModalOpen] =
    useState(false);

  const [editModalOpen, setEditModalOpen] =
    useState(false);

  const [
    assignSubjectsModalOpen,
    setAssignSubjectsModalOpen,
  ] = useState(false);

  const [
    assignClassesModalOpen,
    setAssignClassesModalOpen,
  ] = useState(false);

  const [
    selectedTeacher,
    setSelectedTeacher,
  ] = useState<any>(null);

  const [newTeacher, setNewTeacher] =
    useState<any>(null);

  const [
    profileModalOpen,
    setProfileModalOpen,
  ] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<any>(null);

  const [viewTarget, setViewTarget] =
    useState<any>(null);

  // ------------------------------------------------
  // Sync initial teachers
  // ------------------------------------------------

  useEffect(() => {
    setTeachers(
      initialTeachers || []
    );
  }, [initialTeachers]);

  // ------------------------------------------------
  // Sync list fetcher
  // ------------------------------------------------

  useEffect(() => {
    if (
      listFetcher.data?.teachers
    ) {
      setTeachers(
        listFetcher.data.teachers
      );
    }
  }, [listFetcher.data]);

  // ------------------------------------------------
  // Filter
  // ------------------------------------------------

  const filteredTeachers =
    teachers.filter(
      (teacher) => {
        const firstName =
          teacher.firstName ||
          '';

        const lastName =
          teacher.lastName ||
          '';

        const subject =
          teacher.subject ||
          '';

        const matchesSearch =
          firstName
            .toLowerCase()
            .includes(
              search.toLowerCase()
            ) ||
          lastName
            .toLowerCase()
            .includes(
              search.toLowerCase()
            ) ||
          subject
            .toLowerCase()
            .includes(
              search.toLowerCase()
            );

        const matchesFilter =
          statusFilter ===
            'all' ||
          teacher.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );

  // ------------------------------------------------
  // Pagination
  // ------------------------------------------------

  const {
    currentPage,
    totalPages,
    paginatedItems:
      paginatedTeachersList,
    startIndex,
    goToPage,
  } = usePagination(
    filteredTeachers,
    10
  );

  // ------------------------------------------------
  // Track submitted method
  // ------------------------------------------------

  useEffect(() => {
    if (
      fetcher.state ===
        'submitting' &&
      fetcher.formData
    ) {
      const method =
        (fetcher.formData.get(
          '_method'
        ) as string) ||
        null;

      lastMethod.current =
        method ??
        fetcher.formMethod ??
        null;
    }
  }, [
    fetcher.formData,
    fetcher.state,
    fetcher.formMethod,
  ]);

  // ------------------------------------------------
  // Handle action response
  // ------------------------------------------------

  useEffect(() => {
    if (
      fetcher.state !== 'idle' ||
      !fetcher.data
    ) {
      return;
    }

    const data =
      fetcher.data;

    // Refresh list after mutation
    listFetcher.load(
      window.location.pathname
    );

    // Error
    if (data.error) {
      toast.error(
        data.error ||
          'An error occurred.'
      );

      lastMethod.current =
        null;

      return;
    }

    if (data.success) {
      // --------------------------------------------
      // Subjects
      // --------------------------------------------

      if (
        data.action ===
        'assign_subjects'
      ) {
        toast.success(
          'Subjects assigned successfully!'
        );

        lastMethod.current =
          null;

        return;
      }

      // --------------------------------------------
      // Classes
      // --------------------------------------------

      if (
        data.action ===
        'assign_classes'
      ) {
        toast.success(
          'Classes assigned successfully!'
        );

        lastMethod.current =
          null;

        return;
      }

      // --------------------------------------------
      // CRUD
      // --------------------------------------------

      switch (
        lastMethod.current
      ) {
        case 'POST':
          if (data.teacher) {
            setNewTeacher(
              data.teacher
            );

            setAddModalOpen(
              false
            );

            setProfileModalOpen(
              true
            );

            toast.success(
              'Teacher added successfully!'
            );
          }

          break;

        case 'PUT':
          toast.success(
            'Teacher updated successfully!'
          );

          if (data.teacher) {
            setTeachers(
              (prev) =>
                prev.map(
                  (teacher) =>
                    teacher.id ===
                    data.teacher.id
                      ? {
                          ...teacher,
                          ...data.teacher,
                        }
                      : teacher
                )
            );
          }

          break;

        case 'DELETE':
          toast.success(
            'Teacher deleted successfully!'
          );

          if (data.id) {
            setTeachers(
              (prev) =>
                prev.filter(
                  (teacher) =>
                    teacher.id !==
                    Number(
                      data.id
                    )
                )
            );
          }

          setDeleteTarget(
            null
          );

          break;
      }

      lastMethod.current =
        null;
    }
  }, [
    fetcher.state,
    fetcher.data,
  ]);

  // ------------------------------------------------
  // Render
  // ------------------------------------------------

  return (
    <div className="space-y-6 h-screen overflow-y-auto">
      {/* Header */}

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
          className="w-full sm:w-auto bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-110 hover:text-white transition cursor-pointer"
          onClick={() =>
            setAddModalOpen(true)
          }
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
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={
                setStatusFilter
              }
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  All
                </SelectItem>

                <SelectItem value="Active">
                  Active
                </SelectItem>

                <SelectItem value="Inactive">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Table */}

        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="text-xs sm:text-sm min-w-[1100px]">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold">
                    SN
                  </TableHead>

                  <TableHead className="font-semibold">
                    First name
                  </TableHead>

                  <TableHead className="font-semibold">
                    Last name
                  </TableHead>

                  <TableHead className="font-semibold">
                    Campus
                  </TableHead>

                  <TableHead className="font-semibold">
                    Assigned Subjects
                  </TableHead>

                  <TableHead className="font-semibold">
                    Assigned Classes
                  </TableHead>

                  <TableHead className="font-semibold">
                    Email
                  </TableHead>

                  <TableHead className="font-semibold">
                    Phone
                  </TableHead>

                  <TableHead className="font-semibold">
                    Status
                  </TableHead>

                  <TableHead className="text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
{paginatedTeachersList?.map(
                  (
                    teacher,
                    index
                  ) => {
                    const teacherCampus =
                      campuses.find(
                        (campus) =>
                          campus.id ===
                          teacher.campusId
                      );

                    return (
                      <TableRow
                        key={
                          teacher.id
                        }
                        className="text-[10px] sm:text-xs"
                      >
                        {/* SN */}

                        <TableCell>
                          {startIndex +
                            index +
                            1}
                        </TableCell>

                        {/* First name */}

                        <TableCell>
                          {
                            teacher.firstName
                          }
                        </TableCell>

                        {/* Last name */}

                        <TableCell>
                          {
                            teacher.lastName
                          }
                        </TableCell>

                        {/* Campus */}

                        <TableCell>
                          {teacherCampus ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {
                                  teacherCampus.name
                                }
                              </span>

                              {teacherCampus.isMain && (
                                <span className="text-xs text-muted-foreground">
                                  Main Campus
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No campus
                            </span>
                          )}
                        </TableCell>

                        {/* Subjects */}

                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {teacher.subjects
                              ?.length >
                            0 ? (
                              teacher.subjects.map(
                                (
                                  subject: any
                                ) => (
                                  <Badge
                                    key={
                                      subject.id
                                    }
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {
                                      subject.code
                                    }
                                  </Badge>
                                )
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No subjects
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Classes */}

                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {teacher.classes
                              ?.length >
                            0 ? (
                              teacher.classes.map(
                                (
                                  classItem: any
                                ) => (
                                  <Badge
                                    key={
                                      classItem.id
                                    }
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {
                                      classItem.name
                                    }
                                  </Badge>
                                )
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No classes
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Email */}

                        <TableCell>
                          {
                            teacher.email ||
                            '—'
                          }
                        </TableCell>

                        {/* Phone */}

                        <TableCell>
                          {
                            teacher.phone ||
                            '—'
                          }
                        </TableCell>

                        {/* Status */}

                        <TableCell>
                          <Badge
                            variant={
                              teacher.status ===
                              'Active'
                                ? 'default'
                                : 'outline'
                            }
                          >
                            {
                              teacher.status
                            }
                          </Badge>
                        </TableCell>

                        {/* Actions */}

                        <TableCell className="text-right">
                          {/* Desktop */}

                          <div className="hidden lg:flex justify-end gap-2">
                            <TeacherProfileModal
                              teacher={
                                teacher
                              }
                            />

                            <Button
                              className="hover:scale-110 transition cursor-pointer"
                              variant="ghost"
                              size="sm"
                              title="Assign Subjects"
                              onClick={() => {
                                setSelectedTeacher(
                                  teacher
                                );

                                setAssignSubjectsModalOpen(
                                  true
                                );
                              }}
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>

                            <Button
                              className="hover:scale-110 transition cursor-pointer"
                              variant="ghost"
                              size="sm"
                              title="Assign Classes"
                              onClick={() => {
                                setSelectedTeacher(
                                  teacher
                                );

                                setAssignClassesModalOpen(
                                  true
                                );
                              }}
                            >
                              <GraduationCap className="h-4 w-4" />
                            </Button>

                            <Button
                              className="hover:scale-110 transition cursor-pointer"
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              onClick={() => {
                                setSelectedTeacher(
                                  teacher
                                );

                                setEditModalOpen(
                                  true
                                );
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <DeleteStudentButton
                              id={
                                teacher.id
                              }
                              name={`${teacher.firstName} ${teacher.lastName}`}
                              fetcher={
                                fetcher
                              }
                            />
                          </div>

                          {/* Mobile */}

                          <div className="flex lg:hidden justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="cursor-pointer"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    setViewTarget(
                                      teacher
                                    )
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTeacher(
                                      teacher
                                    );

                                    setAssignSubjectsModalOpen(
                                      true
                                    );
                                  }}
                                >
                                  <BookOpen className="mr-2 h-4 w-4" />
                                  Assign Subjects
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTeacher(
                                      teacher
                                    );

                                    setAssignClassesModalOpen(
                                      true
                                    );
                                  }}
                                >
                                  <GraduationCap className="mr-2 h-4 w-4" />
                                  Assign Classes
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTeacher(
                                      teacher
                                    );

                                    setEditModalOpen(
                                      true
                                    );
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setDeleteTarget(
                                      teacher
                                    )
                                  }
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}

                {paginatedTeachersList.length ===
                  0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No teachers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}

          <PaginationControls
            currentPage={
              currentPage
            }
            totalPages={
              totalPages
            }
            onPageChange={
              goToPage
            }
          />
        </CardContent>
      </Card>

      {/* ------------------------------------------------
          Add Teacher Modal
          ------------------------------------------------ */}

      {addModalOpen && (
        <AddTeacherModal
          open={
            addModalOpen
          }
          setOpen={
            setAddModalOpen
          }
          fetcher={
            fetcher
          }
          subjects={
            allSubjects || []
          }
          campuses={
            campuses || []
          }
        />
      )}

      {/* ------------------------------------------------
          Edit Teacher Modal
          ------------------------------------------------ */}

      {editModalOpen &&
        selectedTeacher && (
          <EditTeacherModal
            open={
              editModalOpen
            }
            setOpen={
              setEditModalOpen
            }
            teacher={
              selectedTeacher
            }
            fetcher={
              fetcher
            }
          />
        )}

      {/* ------------------------------------------------
          Assign Subjects Modal
          ------------------------------------------------ */}

      {assignSubjectsModalOpen &&
        selectedTeacher && (
          <AssignSubjectsModal
            open={
              assignSubjectsModalOpen
            }
            setOpen={
              setAssignSubjectsModalOpen
            }
            teacher={
              selectedTeacher
            }
            availableSubjects={
              allSubjects || []
            }
            assignedSubjects={
              selectedTeacher.subjects ||
              []
            }
            fetcher={
              fetcher
            }
          />
        )}

      {/* ------------------------------------------------
          Assign Classes Modal
          ------------------------------------------------ */}

      {assignClassesModalOpen &&
        selectedTeacher && (
          <AssignClassesToTeacherModal
            open={
              assignClassesModalOpen
            }
            setOpen={
              setAssignClassesModalOpen
            }
            teacher={
              selectedTeacher
            }
            availableClasses={
              allClasses || []
            }
            assignedClasses={
              selectedTeacher.classes ||
              []
            }
            fetcher={
              fetcher
            }
          />
        )}

      {/* ------------------------------------------------
          Newly Created Teacher Profile
          ------------------------------------------------ */}

      <TeacherProfileModal
        teacher={
          newTeacher
        }
        open={
          profileModalOpen
        }
        onOpenChange={(
          open: boolean
        ) =>
          setProfileModalOpen(
            open
          )
        }
        showTrigger={false}
      />

      {/* ------------------------------------------------
          Mobile View Profile
          ------------------------------------------------ */}

      {viewTarget && (
        <TeacherProfileModal
          teacher={
            viewTarget
          }
          open={
            !!viewTarget
          }
          onOpenChange={(
            open: boolean
          ) => {
            if (!open) {
              setViewTarget(
                null
              );
            }
          }}
          showTrigger={false}
        />
      )}

      {/* ------------------------------------------------
          Mobile Delete Confirmation
          ------------------------------------------------ */}

      {deleteTarget && (
        <DeleteStudentButton
          id={
            deleteTarget.id
          }
          name={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          fetcher={
            fetcher
          }
          open={
            !!deleteTarget
          }
          onOpenChange={(
            open
          ) => {
            if (!open) {
              setDeleteTarget(
                null
              );
            }
          }}
          showTrigger={false}
        />
      )}
    </div>
  );
}
