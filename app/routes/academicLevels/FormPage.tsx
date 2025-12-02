import { useEffect, useRef, useState } from 'react';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Link,
  useFetcher,
  useLoaderData,
  useParams,
} from 'react-router';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import {
  Plus,
  Pencil,
  Users,
  ChevronRight,
  GraduationCap,
  School,
  LayoutGrid,
  List,
} from 'lucide-react';
import { toast } from 'sonner';
import type AcademicLevelService from 'workers/services/academic-levels';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import { PageHeader } from '~/components/ui/PageHeader';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import type { LevelType } from '~/type/shools';
import CreateClassModal from '~/components/modal/CreateClassModal';
import EditClassModal from '~/components/modal/EditClassModal';

const LEVEL_TYPE: LevelType = 'o-level';

// --- Loader: fetch form with its classes ---
export async function loader({ context, params }: LoaderFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  const streamId = Number(params.streamId);
  const formNumber = Number(params.formId); // This is actually the form number (1-4)

  if (!streamId || isNaN(streamId)) {
    throw new Response('Invalid stream ID', { status: 400 });
  }
  if (!formNumber || isNaN(formNumber) || formNumber < 1 || formNumber > 6) {
    throw new Response('Invalid form number', { status: 400 });
  }

  // Get stream details
  const stream = await services.academicLevel.getStreamById(streamId);
  if (!stream) {
    throw new Response('Stream not found', { status: 404 });
  }

  // Get form details by stream ID and form number
  let form = await services.academicLevel.getFormByStreamIdAndNumber(
    streamId,
    formNumber
  );

  // If form doesn't exist, create it automatically
  if (!form) {
    form = await services.academicLevel.createForm({
      name: `Form ${formNumber}`,
      number: formNumber,
      streamId,
      levelId: stream.levelId,
    });
    if (!form) {
      throw new Response('Failed to create form', { status: 500 });
    }
  }

  // Get level info
  const level = await services.academicLevel.getLevelById(stream.levelId);

  // Get classes for this form
  const classes = await services.academicLevel.getFormClassesByFormId(form.id);

  // Calculate totals
  const totalStudents = classes.reduce(
    (sum, c) => sum + (c.studentCount || 0),
    0
  );

  return { stream, form, level, classes, totalStudents };
}

// --- Action: handle form class CRUD operations ---
export async function action({ request, context, params }: ActionFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  const streamId = Number(params.streamId);
  const formNumber = Number(params.formId); // This is actually the form number (1-4)
  const formData = await request.formData();
  const method = (formData.get('_method') as string) || request.method;

  try {
    // Get stream and form to verify they exist
    const stream = await services.academicLevel.getStreamById(streamId);
    if (!stream) {
      return new Response(JSON.stringify({ error: 'Stream not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const form = await services.academicLevel.getFormByStreamIdAndNumber(
      streamId,
      formNumber
    );
    if (!form) {
      return new Response(JSON.stringify({ error: 'Form not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CREATE CLASS
    if (method === 'POST') {
      const name = formData.get('name') ? String(formData.get('name')) : '';
      const studentCount = formData.get('studentCount')
        ? Number(formData.get('studentCount'))
        : 0;

      if (!name) {
        return new Response(
          JSON.stringify({ error: 'Class name is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const created = await services.academicLevel.createFormClass({
        name,
        formId: form.id,
        streamId,
        levelId: stream.levelId,
        studentCount,
      });

      return { success: true, formClass: created };
    }

    // UPDATE CLASS
    if (method === 'PUT') {
      const id = formData.get('id');
      const name = formData.get('name')
        ? String(formData.get('name'))
        : undefined;
      const studentCount = formData.get('studentCount')
        ? Number(formData.get('studentCount'))
        : undefined;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Class ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const updated = await services.academicLevel.updateFormClass(Number(id), {
        name,
        studentCount,
      });

      return { success: true, formClass: updated };
    }

    // DELETE CLASS
    if (method === 'DELETE') {
      const id = formData.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Class ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await services.academicLevel.deleteFormClass(Number(id));
      return { success: true, id: Number(id) };
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('FormPage action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// --- FormPage Component ---
export default function FormPage() {
  const {
    stream,
    form,
    level,
    classes: initialClasses,
    totalStudents,
  } = useLoaderData<{
    stream: {
      id: number;
      name: string;
      levelId: number;
      levelType: string;
      color: 'science' | 'arts' | 'business';
    };
    form: {
      id: number;
      name: string;
      number: number;
      streamId: number;
      levelId: number;
    };
    level: {
      id: number;
      name: string;
      type: string;
    } | null;
    classes: Array<{
      id: number;
      name: string;
      formId: number;
      streamId: number;
      levelId: number;
      studentCount: number;
    }>;
    totalStudents: number;
  }>();

  const params = useParams();
  const fetcher = useFetcher();
  const listFetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [classes, setClasses] = useState(initialClasses ?? []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Track last method for toast messages
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
        lastMethod.current = null;
        return;
      }

      if (data.success) {
        switch (lastMethod.current) {
          case 'POST':
            toast.success('Class added successfully!');
            if (data.formClass) {
              setClasses((prev) => [...prev, data.formClass]);
            }
            listFetcher.load(window.location.pathname);
            break;
          case 'PUT':
            toast.success('Class updated successfully!');
            if (data.formClass) {
              setClasses((prev) =>
                prev.map((c) =>
                  c.id === data.formClass.id ? data.formClass : c
                )
              );
            }
            listFetcher.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.success('Class deleted successfully!');
            setClasses((prev) => prev.filter((c) => c.id !== data.id));
            break;
          default:
            toast.success('Action completed successfully.');
            listFetcher.load(window.location.pathname);
        }
        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Sync list on reload
  useEffect(() => {
    if (listFetcher.state === 'idle' && listFetcher.data) {
      setClasses(listFetcher.data.classes);
    }
  }, [listFetcher.state, listFetcher.data]);

  const handleEditClass = (classItem: any) => {
    setSelectedClass(classItem);
    setIsEditModalOpen(true);
  };

  const getStreamColorClasses = (color: 'science' | 'arts' | 'business') => {
    switch (color) {
      case 'science':
        return 'border-blue-200 bg-blue-50';
      case 'arts':
        return 'border-purple-200 bg-purple-50';
      case 'business':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getClassColorClasses = (color: 'science' | 'arts' | 'business') => {
    switch (color) {
      case 'science':
        return 'bg-blue-500';
      case 'arts':
        return 'bg-purple-500';
      case 'business':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getClassCardBg = (color: 'science' | 'arts' | 'business') => {
    switch (color) {
      case 'science':
        return 'hover:border-blue-300 hover:bg-blue-50/50';
      case 'arts':
        return 'hover:border-purple-300 hover:bg-purple-50/50';
      case 'business':
        return 'hover:border-amber-300 hover:bg-amber-50/50';
      default:
        return 'hover:border-gray-300 hover:bg-gray-50/50';
    }
  };

  // Sort classes alphabetically
  const sortedClasses = [...classes].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Calculate current total students
  const currentTotalStudents = classes.reduce(
    (sum, c) => sum + (c.studentCount || 0),
    0
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link
          to="/levels/o-level"
          className="hover:text-foreground transition-colors"
        >
          O-Level
        </Link>
        <ChevronRight size={14} />
        <Link
          to={`/levels/o-level/${params.streamId}`}
          className="hover:text-foreground transition-colors"
        >
          {stream.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{form.name}</span>
      </nav>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">{form.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and organize classes for {stream.name} – Form {form.number}
          </p>

          {/* small badges under title */}
          <div className="flex items-center gap-2 mt-2">
            <LevelBadge level={LEVEL_TYPE} size="md" />
            <StreamBadge stream={stream.color} size="md" />
          </div>
        </div>

        {/* Right Actions */}
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

          {/* Add Button */}
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary-gradient text-white rounded-lg px-4 py-2 flex items-center gap-2 w-full sm:w-auto"
          >
            <span className="text-xl">+</span>
            <span className="font-medium">Add Class</span>
          </Button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {sortedClasses.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">No classes yet.</p>
      ) : view === 'grid' ? (
        /* GRID VIEW – EXACT MATCH */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedClasses.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition flex flex-col gap-3"
            >
              <Link to=".">
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
                    <span className="font-bold">Form:</span>
                    <span>{form.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-bold">Stream:</span>
                    <span>{stream.name}</span>
                  </div>
                </div>

                {/* Counts */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users size={14} /> {c.studentCount || 0} students
                  </div>
                </div>
              </Link>

              {/* Actions */}
              <div className="flex justify-between mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClass(c);
                    setIsEditModalOpen(true);
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
        /* LIST VIEW – EXACT MATCH */
        <div className="space-y-3">
          {sortedClasses.map((c) => (
            <div
              key={c.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <Link to="." className="flex gap-4 items-start">
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
                    {form.name} • {stream.name}
                  </p>
                </div>
              </Link>

              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Users size={14} /> {c.studentCount || 0} students
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClass(c);
                    setIsEditModalOpen(true);
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
      )}

      {/* Modals */}
      <CreateClassModal
        open={isAddModalOpen}
        setOpen={setIsAddModalOpen}
        fetcher={fetcher}
        formNumber={form.number}
      />

      <EditClassModal
        open={isEditModalOpen}
        setOpen={setIsEditModalOpen}
        fetcher={fetcher}
        editingClass={selectedClass}
        formNumber={form.number}
      />
    </div>
  );
}
