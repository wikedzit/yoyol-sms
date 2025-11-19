import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  GraduationCap,
  Users,
  LayoutGrid,
  List,
  Pencil,
  Trash,
  Trash2,
} from 'lucide-react';
import {
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { Button } from '~/components/ui/button';
import { Link } from 'react-router-dom';
import CreateClassModal from '~/components/modal/CreateClassModal';
import EditClassModal from '~/components/modal/EditClassModal';
import { toast } from 'sonner';
import type SubjectService from 'workers/services/subjects';
import type ClassService from 'workers/services/class';
import type ClassSubjectService from 'workers/services/class-subjects';
import type TeacherClassService from 'workers/services/teacher-classes';
import type TeacherService from 'workers/services/teachers';
import { BookOpen, Users as UsersIcon } from 'lucide-react';
import AssignTeachersToClassModal from '~/components/modal/AssignTeachersToClassModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';

// 🧠 Loader – fetch classes with student, subject, and teacher counts
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    class: ClassService;
    subject: SubjectService;
    classSubject: ClassSubjectService;
    teacherClass: TeacherClassService;
    teacher: TeacherService;
  };

  const classes = await services.class.getAllWithStudentCount({
    offset: 0,
    sortBy: 'name',
    sortOrder: 'asc',
    search: '',
    limit: 100,
  });

  // Get all teachers for assignment modal
  const allTeachers = await services.teacher.getAllTeachers({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });

  // Get subject count and teachers for each class
  const classesWithCounts = await Promise.all(
    classes.map(async (classItem) => {
      const subjects = await services.classSubject.getSubjectsByClass(
        classItem.id
      );
      const teachers = await services.teacherClass.getTeachersByClass(
        classItem.id
      );
      return {
        ...classItem,
        subjectCount: subjects.length,
        teacherCount: teachers.length,
        teachers: teachers, // Store teachers for modal use
      };
    })
  );

  return { classes: classesWithCounts, allTeachers };
}

// ⚙️ Action – handle create, update, delete, and teacher assignments
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as {
    class: ClassService;
    teacherClass: TeacherClassService;
  };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  const action = form.get('action') as string | null;

  try {
    // --- ASSIGN TEACHERS TO CLASS ---
    if (action === 'assign_teachers') {
      const classId = Number(form.get('classId'));
      const teacherIds = JSON.parse(String(form.get('teacherIds') || '[]'));

      if (!classId) {
        return new Response(JSON.stringify({ error: 'Class ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await services.teacherClass.replaceClassTeachers(classId, teacherIds);
      return { success: true, action: 'assign_teachers' };
    }
    if (method === 'POST') {
      const name = form.get('name') ? String(form.get('name')) : '';
      const EducationalLevel = form.get('EducationalLevel')
        ? String(form.get('EducationalLevel'))
        : '';
      const section = form.get('section') ? String(form.get('section')) : '';
      const yearStr = form.get('year') ? String(form.get('year')) : '';

      if (!EducationalLevel || !section || !yearStr) {
        return new Response(
          JSON.stringify({
            error: 'EducationalLevel, section, and year are required',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const year = parseInt(yearStr);
      if (isNaN(year)) {
        return new Response(
          JSON.stringify({ error: 'Year must be a valid number' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const created = await services.class.create({
        name,
        EducationalLevel,
        section,
        year,
      });
      return { success: true, class: created };
    }

    if (method === 'PUT') {
      const id = form.get('id');
      const name = form.get('name');
      const EducationalLevel = form.get('EducationalLevel');
      const section = form.get('section');
      const year = form.get('year');

      if (!id || !name || !EducationalLevel || !section || !year) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const updated = await services.class.update(parseInt(String(id)), {
        name: String(name),
        EducationalLevel: String(EducationalLevel),
        section: String(section),
        year: year ? parseInt(String(year)) : undefined,
      });
      return { success: true, class: updated };
    }

    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id)
        return new Response(JSON.stringify({ error: 'Missing id' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      await services.class.delete(parseInt(String(id)));
      return { success: true };
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('classes.action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export default function ClassesRoute() {
  const { classes: initialClasses, allTeachers } = useLoaderData() as {
    classes: Array<{
      id: number;
      name: string;
      EducationalLevel: string;
      section: string;
      year: number;
      studentCount: number;
      subjectCount: number;
      teacherCount: number;
      teachers?: Array<{
        id: number;
        firstName: string;
        lastName: string;
        email?: string;
      }>;
    }>;
    allTeachers: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      status: string;
    }>;
  };
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const listFetcher = useFetcher();
  const [classes, setClasses] = useState(initialClasses ?? []);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [assignTeachersModalOpen, setAssignTeachersModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  const deletingId = useRef<number | null>(null);

  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method =
        (fetcher.formData.get('_method') as string) ?? fetcher.formMethod;
      lastMethod.current = method;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // Handle toast + optimistic UI updates
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;
      listFetcher.load(window.location.pathname); // refresh list after any action

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        deletingId.current = null;
        lastMethod.current = null;
        return;
      }

      const actionValue = (fetcher.formData as FormData | undefined)?.get(
        'action'
      );
      const action = actionValue ? String(actionValue) : null;

      if (action === 'assign_teachers') {
        toast.success('Teachers assigned successfully!');
        // Reload to refresh teacher counts
        listFetcher.load(window.location.pathname);
        lastMethod.current = null;
        return;
      }

      switch (lastMethod.current) {
        case 'POST':
          if (data.class)
            setClasses((prev) => [
              {
                ...data.class,
                subjectCount: 0,
                studentCount: 0,
                teacherCount: 0,
              },
              ...prev,
            ]);
          toast.success('Classroom added successfully!');
          listFetcher.load(window.location.pathname);
          break;
        case 'PUT':
          if (data.class)
            setClasses((prev) =>
              prev.map((c) =>
                c.id === data.class.id
                  ? {
                      ...data.class,
                      subjectCount: c.subjectCount || 0,
                      studentCount: c.studentCount || 0,
                      teacherCount: c.teacherCount || 0,
                    }
                  : c
              )
            );
          toast.success('Classroom updated successfully!');
          listFetcher.load(window.location.pathname);
          break;
        case 'DELETE':
          toast.error('Faculty deleted successfully!');
          setClasses((prev) => prev.filter((c) => c.id !== data.id));
          listFetcher.load(window.location.pathname);
          break;

        default:
          toast.success('Action completed successfully.');
          listFetcher.load(window.location.pathname);
      }

      lastMethod.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  // if listFetcher has fresh loader data, sync local state (keeps counts, nested info up-to-date)
  useEffect(() => {
    if (listFetcher.state === 'idle' && listFetcher.data) {
      setClasses(listFetcher.data.classes);
    }
  }, [listFetcher.state, listFetcher.data]);

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Classrooms</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and organize your classrooms
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`p-2 transition ${
                view === 'grid'
                  ? 'bg-primary-gradient text-white'
                  : 'text-gray-500'
              }`}
            >
              <LayoutGrid size={18} />
            </button>

            <button
              onClick={() => setView('list')}
              className={`p-2 transition ${
                view === 'list'
                  ? 'bg-primary-gradient text-white'
                  : 'text-gray-500'
              }`}
            >
              <List size={18} />
            </button>
          </div>

          {/* Create Button */}
          <Button
            onClick={() => setOpenCreate(true)}
            className="bg-primary-gradient text-white rounded-lg px-4 py-2 flex items-center gap-2 w-full sm:w-auto"
          >
            <span className="text-xl">+</span>
            <span className="font-medium">Add Classroom</span>
          </Button>
        </div>
      </div>

      {/* LIST OR GRID */}
      {classes.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">No classrooms yet.</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition flex flex-col gap-3"
            >
              <Link to={`/classes/${c.id}`}>
                {/* Image */}
                <img
                  src="/assets/card_image.png"
                  className="w-full h-32 sm:h-36 object-cover rounded-lg"
                />

                {/* Top Section */}
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-bold">Name:</span>
                    <span>{c.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Year:</span>
                    <span>{c.year}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-bold">Level:</span>
                    <span>{c.EducationalLevel}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-bold">Section:</span>
                    <span>{c.section}</span>
                  </div>
                </div>

                {/* Counts */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users size={14} /> {c.studentCount} students
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen size={14} /> {c.subjectCount} subjects
                  </div>
                  <div className="flex items-center gap-1">
                    <UsersIcon size={14} /> {c.teacherCount} teachers
                  </div>
                </div>
              </Link>

              {/* Actions */}
              <div className="flex justify-between mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingClass(c);
                    setOpenEdit(true);
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-black hover:scale-105 transition"
                >
                  <Pencil size={16} /> Edit
                </Button>

                <DeleteStudentButton
                  id={String(c.id)}
                  name={c.name}
                  fetcher={fetcher}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-3">
          {classes.map((c) => (
            <div
              key={c.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <Link to={`/classes/${c.id}`} className="flex gap-4 items-start">
                {/* Thumbnail */}
                <img
                  src="/assets/card_image.png"
                  className="w-14 h-14 rounded-lg object-cover"
                />

                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {c.name}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {c.EducationalLevel} • Section {c.section} • Year {c.year}
                  </p>
                </div>
              </Link>

              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Users size={14} /> {c.studentCount} students
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen size={14} /> {c.subjectCount} subjects
                </span>
                <span className="flex items-center gap-1">
                  <UsersIcon size={14} /> {c.teacherCount} teachers
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingClass(c);
                    setOpenEdit(true);
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-black hover:scale-105 transition"
                >
                  <Pencil size={16} /> Edit
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const formData = new FormData();
                    formData.append('_method', 'DELETE');
                    formData.append('id', String(c.id));
                    fetcher.submit(formData, { method: 'post' });
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:scale-105 transition"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateClassModal
        open={openCreate}
        setOpen={setOpenCreate}
        fetcher={fetcher}
      />
      <EditClassModal
        open={openEdit}
        setOpen={setOpenEdit}
        fetcher={fetcher}
        editingClass={editingClass}
      />

      {assignTeachersModalOpen && selectedClass && (
        <AssignTeachersToClassModal
          open={assignTeachersModalOpen}
          setOpen={setAssignTeachersModalOpen}
          classData={selectedClass}
          availableTeachers={allTeachers}
          assignedTeachers={selectedClass.teachers ?? []}
          fetcher={fetcher}
        />
      )}
    </div>
  );
}
