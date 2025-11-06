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
import { BookOpen } from 'lucide-react';

// 🧠 Loader – fetch classes with student and subject counts
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    class: ClassService;
    subject: SubjectService;
    classSubject: ClassSubjectService;
  };

  const classes = await services.class.getAllWithStudentCount({
    offset: 0,
    sortBy: 'name',
    sortOrder: 'asc',
    search: '',
    limit: 100,
  });

  // Get subject count for each class
  const classesWithSubjectCount = await Promise.all(
    classes.map(async (classItem) => {
      const subjects = await services.classSubject.getSubjectsByClass(
        classItem.id
      );
      return {
        ...classItem,
        subjectCount: subjects.length,
      };
    })
  );

  return { classes: classesWithSubjectCount };
}

// ⚙️ Action – handle create, update, delete
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services;
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    if (method === 'POST') {
      const name = form.get('name');
      const EducationalLevel = form.get('EducationalLevel');
      const section = form.get('section');
      const year = form.get('year');

      if (!EducationalLevel || !section || !year) {
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

      const created = await services.class.create({
        name,
        EducationalLevel,
        section,
        year: year ? parseInt(String(year)) : undefined,
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
  const { classes: initialClasses } = useLoaderData() as {
    classes: Array<{
      id: number;
      name: string;
      EducationalLevel: string;
      section: string;
      year: number;
      studentCount: number;
      subjectCount: number;
    }>;
  };
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const [classes, setClasses] = useState(initialClasses ?? []);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid'); // 🟢 Add view state

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

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        deletingId.current = null;
        lastMethod.current = null;
        return;
      }

      switch (lastMethod.current) {
        case 'POST':
          if (data.class)
            setClasses((prev) => [
              { ...data.class, subjectCount: 0, studentCount: 0 },
              ...prev,
            ]);
          toast.success('Classroom added successfully!');
          break;
        case 'PUT':
          if (data.class)
            setClasses((prev) =>
              prev.map((c) =>
                c.id === data.class.id
                  ? { ...data.class, subjectCount: c.subjectCount || 0, studentCount: c.studentCount || 0 }
                  : c
              )
            );
          toast.success('Classroom updated successfully!');
          break;
        case 'DELETE':
          if (deletingId.current !== null) {
            setClasses((prev) =>
              prev.filter((c) => c.id !== deletingId.current)
            );
            toast.error('Classroom deleted successfully!');
            deletingId.current = null;
          }
          break;
        default:
          toast.success('Action completed successfully.');
      }

      lastMethod.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classrooms</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your classrooms
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`p-2 ${
                view === 'grid'
                  ? 'bg-primary-gradient  text-white'
                  : 'text-gray-500 cursor-pointer'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 ${
                view === 'list'
                  ? 'bg-primary-gradient  text-white'
                  : 'text-gray-500 cursor-pointer'
              }`}
            >
              <List size={18} />
            </button>
          </div>

          {/* Create button */}
          <Button
            onClick={() => setOpenCreate(true)}
            className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="font-medium">Add Classroom</span>
          </Button>
        </div>
      </div>

      {/* Classroom Display */}
      {classes.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">No classrooms yet.</p>
      ) : view === 'grid' ? (
        // Grid view
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {classes.map((c) => (
              <Link
                to={`/classes/${c.id}`}
                key={c.id}
                className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition"
              >
                <img src="assets/card_image.png" alt="card Image" />
                <div className="">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs  text-gray-900">
                      <strong>Name:</strong>
                      {c.name}
                    </h3>
                    <p className="text-xs  text-gray-900">
                      <strong>Year:</strong> {c.year}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs  text-gray-900">
                      <strong>Level:</strong> {c.EducationalLevel}
                    </p>
                    <p className="text-xs  text-gray-900">
                      <strong>Section:</strong> {c.section}
                    </p>
                  </div>
                </div>
                {/* number of students and subjects for this class */}
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{c.studentCount || 0} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} />
                    <span>{c.subjectCount || 0} subjects</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingClass(c);
                      setOpenEdit(true);
                    }}
                    className="flex items-center gap-2 text-gray-600 hover:scale-110 hover:font-semibold transition cursor-pointer"
                  >
                    <Pencil size={16} />
                    Edit
                  </Button>

                  {/* TODO: delete not working  on class:  You can't delete a class with students enrolled */}
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        const formData = new FormData();
                        formData.append('_method', 'DELETE');
                        formData.append('id', String(c.id));
                        deletingId.current = c.id;
                        fetcher.submit(formData, { method: 'post' });
                      }}
                      className="flex items-center gap-2 text-gray-600 hover:scale-110 hover:text-red-600 transition cursor-pointer"
                    >
                      <Trash2 size={16} />
                      Delete
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        // List view
        <div className="space-y-3">
          {classes.map((c) => (
            <Link
              to={`/classes/${c.id}`}
              key={c.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-gradient rounded-lg flex items-center justify-center">
                  <img
                    src="assets/card_image.png"
                    alt="card Image"
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {c.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {c.EducationalLevel} - Section {c.section} - Year {c.year}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>{c.studentCount || 0} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={16} />
                  <span>{c.subjectCount || 0} subjects</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingClass(c);
                    setOpenEdit(true);
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:scale-110 hover:font-semibold transition cursor-pointer"
                >
                  <Pencil size={16} />
                  Edit
                </Button>

                {/* TODO: delete not working  on class:  You can't delete a class with students enrolled */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    const formData = new FormData();
                    formData.append('_method', 'DELETE');
                    formData.append('id', String(c.id));
                    deletingId.current = c.id;
                    fetcher.submit(formData, { method: 'post' });
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:scale-110 hover:text-red-600 transition cursor-pointer"
                >
                  <Trash2 size={16} />
                  Delete
                </Button>
              </div>
            </Link>
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

      {/* Toast
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-500 animate-fade-in">
          {toast}
        </div>
      )} */}
    </div>
  );
}
