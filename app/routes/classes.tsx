import { useEffect, useRef, useState } from 'react';
import {
  Users,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import {
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { Button } from '~/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type AcademicLevelService from 'workers/services/academic-levels';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import type { LevelType } from '~/type/shools';
import CreateSchoolClassModal from '~/components/modal/CreateSchoolClassModal';
import EditSchoolClassModal from '~/components/modal/EditSchoolClassModal';

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

// 🧠 Loader – fetch all form classes with enriched data
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  // Get all form classes with their related level, stream, form info
  const classes = await services.academicLevel.getAllFormClassesWithDetails();

  // Get streams for creating new classes
  const streams = await services.academicLevel.getAllStreams();

  // Get levels for the filter
  const levels = await services.academicLevel.getLevels();

  return { classes, streams, levels };
}

// ⚙️ Action – handle create, update, delete for form classes
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    // CREATE CLASS
    if (method === 'POST') {
      const name = form.get('name') ? String(form.get('name')) : '';
      const streamId = form.get('streamId')
        ? Number(form.get('streamId'))
        : null;
      const levelId = form.get('levelId') ? Number(form.get('levelId')) : null;
      const formNumber = form.get('formNumber')
        ? Number(form.get('formNumber'))
        : null;
      const studentCount = form.get('studentCount')
        ? Number(form.get('studentCount'))
        : 0;

      if (!name || !streamId || !levelId || !formNumber) {
        return new Response(
          JSON.stringify({
            error: 'Name, stream, level, and form number are required',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Find or create the form based on streamId and formNumber
      let formRecord = await services.academicLevel.getFormByStreamIdAndNumber(
        streamId,
        formNumber
      );

      if (!formRecord) {
        // Create the form if it doesn't exist
        formRecord = await services.academicLevel.createForm({
          name: `Form ${formNumber}`,
          number: formNumber,
          streamId,
          levelId,
        });

        if (!formRecord) {
          return new Response(
            JSON.stringify({ error: 'Failed to create form' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      const created = await services.academicLevel.createFormClass({
        name,
        formId: formRecord.id,
        streamId,
        levelId,
        studentCount,
      });

      return { success: true, formClass: created };
    }

    // UPDATE CLASS
    if (method === 'PUT') {
      const id = form.get('id');
      const name = form.get('name') ? String(form.get('name')) : undefined;
      const studentCount = form.get('studentCount')
        ? Number(form.get('studentCount'))
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
      const id = form.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), {
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
  const {
    classes: initialClasses,
    streams,
    levels,
  } = useLoaderData() as {
    classes: EnrichedFormClass[];
    streams: Array<{
      id: number;
      name: string;
      levelId: number;
      levelType: string;
      color: 'science' | 'arts' | 'business';
    }>;
    levels: Array<{
      id: number;
      name: string;
      type: string;
      description?: string;
    }>;
  };

  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const listFetcher = useFetcher();

  const [classes, setClasses] = useState(initialClasses ?? []);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingClass, setEditingClass] = useState<EnrichedFormClass | null>(
    null
  );
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [levelFilter, setLevelFilter] = useState<'all' | LevelType>('all');

  // Filter classes based on level filter
  const filteredClasses =
    levelFilter === 'all'
      ? classes
      : classes.filter((c) => c.levelType === levelFilter);

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
      listFetcher.load(window.location.pathname);

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        lastMethod.current = null;
        return;
      }

      switch (lastMethod.current) {
        case 'POST':
          toast.success('Class added successfully!');
          listFetcher.load(window.location.pathname);
          break;
        case 'PUT':
          toast.success('Class updated successfully!');
          listFetcher.load(window.location.pathname);
          break;
        case 'DELETE':
          toast.success('Class deleted successfully!');
          if (data.id) {
            setClasses((prev) => prev.filter((c) => c.id !== data.id));
          }
          break;
        default:
          toast.success('Action completed successfully.');
          listFetcher.load(window.location.pathname);
      }

      lastMethod.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  // Sync list on reload
  useEffect(() => {
    if (listFetcher.state === 'idle' && listFetcher.data) {
      setClasses(listFetcher.data.classes);
    }
  }, [listFetcher.state, listFetcher.data]);

  // Get link to class detail page - goes to /classes/:classId
  const getClassDetailLink = (cls: EnrichedFormClass) => {
    return `/classes/${cls.id}`;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage classes across all levels and streams
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`p-2 transition onClick   hover:scale-110 hover:text-white-600 transition cursor-pointer"={() => setView('grid')}
                         ? 'bg-primary-gradient text-white'
                  : 'text-gray-500'
              }`}
            >
              <LayoutGrid size={18} />
            </button>

            <button
              onClick={() => setView('list')}
              className={`p-2 transition  hover:scale-110 hover:text-white-600 transition cursor-pointer"${
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
            className="bg-primary-gradient text-white rounded-lg px-4 py-2 flex items-center gap-2 w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
          >
            <span className="text-xl">+</span>
            <span className="font-medium">Add Class</span>
          </Button>
        </div>
      </div>

      {/* LEVEL FILTER TABS */}
      <div className="flex items-center gap-2 border-b pb-4">
        <button
        
          onClick={() => setLevelFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition hover:scale-110 hover:text-white-600 transition cursor-pointer" ${
            levelFilter === 'all'
              ? 'bg-primary-gradient text-white'
              : ' text-gray-600 cursor-pointer '
              
          }`}
          
        >
          All Levels ({classes.length})
        </button>
        <button
          onClick={() => setLevelFilter('o-level')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2   hover:scale-110 hover:text-white-600 transition cursor-pointer"${
            levelFilter === 'o-level'
              ? 'bg-primary-gradient text-white'
              : 'bg-o-level/10 text-o-level cursor-pointer '
          }`}
        >
          <GraduationCap size={16} />
          O-Level ({classes.filter((c) => c.levelType === 'o-level').length})
        </button>
        <button
          onClick={() => setLevelFilter('a-level')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2  hover:scale-110 hover:text-white-600 transition cursor-pointer"${
            levelFilter === 'a-level'
              ? 'bg-primary-gradient text-white'
              : 'bg-a-level/10 text-a-level cursor-pointer '
          }`}
        >
          <GraduationCap size={16} />
          A-Level ({classes.filter((c) => c.levelType === 'a-level').length})
        </button>
      </div>

      {/* LIST OR GRID */}
      {filteredClasses.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No classes yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {levelFilter === 'all'
              ? 'Get started by creating a new class or set up your academic levels first.'
              : `No ${levelFilter.toUpperCase()} classes found. Create one or check your ${levelFilter.toUpperCase()} structure.`}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Button
              onClick={() => setOpenCreate(true)}
              className="bg-primary-gradient text-white  hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              Add Class
            </Button>
            <Link to="/levels/o-level">
              <Button variant="outline" className=" hover:scale-110 hover:text-white-600 transition cursor-pointer">Set Up O-Level</Button>
            </Link>
            <Link to="/levels/a-level">
              <Button variant="outline" className=" hover:scale-110 hover:text-white-600 transition cursor-pointer">Set Up A-Level</Button>
            </Link>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClasses.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition flex flex-col gap-3"
            >
              <Link to={getClassDetailLink(c)}>
                {/* Image */}
                <img
                  src="/assets/card_image.png"
                  className="w-full h-32 sm:h-36 object-cover rounded-lg"
                  alt={c.name}
                />

                {/* Info Section */}
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-bold">Class:</span>
                    <span>{c.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Form:</span>
                    <span>{c.formName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Stream:</span>
                    <span>{c.streamName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Level:</span>
                    <span>{c.levelName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                  <Users size={14} />
                  <span>{c.studentCount}</span>
                  <span>{c.studentCount === 1 ? "Student" : "Students"}</span>
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
          {filteredClasses.map((c) => (
            <div
              key={c.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <Link
                to={getClassDetailLink(c)}
                className="flex gap-4 items-start flex-1"
              >
                {/* Thumbnail */}
                <img
                  src="/assets/card_image.png"
                  className="w-14 h-14 rounded-lg object-cover"
                  alt={c.name}
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {c.name}
                    </h3>
                    <LevelBadge level={c.levelType} size="sm" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    {c.formName} • {c.streamName} • {c.levelName}
                  </p>
                </div>
              </Link>

              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Users size={14} /> {c.studentCount} students
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
      <CreateSchoolClassModal
        open={openCreate}
        setOpen={setOpenCreate}
        fetcher={fetcher}
        streams={streams}
        levels={levels}
      />

      {editingClass && (
        <EditSchoolClassModal
          open={openEdit}
          setOpen={setOpenEdit}
          fetcher={fetcher}
          editingClass={editingClass}
        />
      )}
    </div>
  );
}
