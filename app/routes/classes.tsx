import { useEffect, useRef, useState } from 'react';
import {
  Users,
  LayoutGrid,
  List,
  Pencil,
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
import type { LevelType } from '~/type/shools';
import CreateSchoolClassModal from '~/components/modal/CreateSchoolClassModal';
import EditSchoolClassModal from '~/components/modal/EditSchoolClassModal';

export interface EnrichedFormClass {
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

interface StreamOption {
  id: number;
  name: string;
  levelId: number;
  levelType: string;
  color: 'science' | 'arts' | 'business';
}

interface LevelOption {
  id: number;
  name: string;
  type: string;
  description?: string;
}

export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  const classes = await services.academicLevel.getAllFormClassesWithDetails();
  const streams = await services.academicLevel.getAllStreams();
  const levels = await services.academicLevel.getLevels();

  return Response.json({ classes, streams, levels });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    if (method === 'POST') {
      const name = form.get('name') ? String(form.get('name')).trim() : '';
      const streamId = form.get('streamId') ? Number(form.get('streamId')) : null;
      const levelId = form.get('levelId') ? Number(form.get('levelId')) : null;
      const formNumber = form.get('formNumber') ? Number(form.get('formNumber')) : null;
      const studentCount = form.get('studentCount') ? Number(form.get('studentCount')) : 0;

      if (!name || !streamId || !levelId || !formNumber) {
        return Response.json(
          { error: 'Name, stream, level, and form number are required' },
          { status: 400 }
        );
      }

      let formRecord = await services.academicLevel.getFormByStreamIdAndNumber(
        streamId,
        formNumber
      );

      if (!formRecord) {
        formRecord = await services.academicLevel.createForm({
          name: `Form ${formNumber}`,
          number: formNumber,
          streamId,
          levelId,
        });

        if (!formRecord) {
          return Response.json({ error: 'Failed to create form' }, { status: 500 });
        }
      }

      const created = await services.academicLevel.createFormClass({
        name,
        formId: formRecord.id,
        streamId,
        levelId,
        studentCount,
      });

      return Response.json({ success: true, formClass: created });
    }

    if (method === 'PUT') {
      const id = form.get('id');
      const name = form.get('name') ? String(form.get('name')).trim() : undefined;
      const studentCount = form.get('studentCount')
        ? Number(form.get('studentCount'))
        : undefined;

      if (!id) {
        return Response.json({ error: 'Class ID is required' }, { status: 400 });
      }

      const updated = await services.academicLevel.updateFormClass(Number(id), {
        name,
        studentCount,
      });

      return Response.json({ success: true, formClass: updated });
    }

    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) {
        return Response.json({ error: 'Missing id' }, { status: 400 });
      }
      await services.academicLevel.deleteFormClass(Number(id));
      return Response.json({ success: true, id: Number(id) });
    }

    return Response.json({ error: 'Unknown method' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('classes.action error:', err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export default function ClassesRoute() {
  const { classes: initialClasses, streams, levels } = useLoaderData() as {
    classes: EnrichedFormClass[];
    streams: StreamOption[];
    levels: LevelOption[];
  };

  const fetcher = useFetcher();
  const listFetcher = useFetcher<{ classes: EnrichedFormClass[] }>();
  const lastMethod = useRef<string | null>(null);

  const [classes, setClasses] = useState<EnrichedFormClass[]>(initialClasses ?? []);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingClass, setEditingClass] = useState<EnrichedFormClass | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [levelFilter, setLevelFilter] = useState<'all' | LevelType>('all');

  // Sync state with incoming loader updates when navigating back or performing full reloads
  useEffect(() => {
    setClasses(initialClasses ?? []);
  }, [initialClasses]);

  const filteredClasses =
    levelFilter === 'all'
      ? classes
      : classes.filter((c) => c.levelType === levelFilter);

  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method =
        (fetcher.formData.get('_method') as string) ?? fetcher.formMethod;
      lastMethod.current = method.toUpperCase();
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;

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
          if (data.success) {
            toast.success('Action completed successfully.');
            listFetcher.load(window.location.pathname);
          }
      }

      lastMethod.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (listFetcher.state === 'idle' && listFetcher.data?.classes) {
      setClasses(listFetcher.data.classes);
    }
  }, [listFetcher.state, listFetcher.data]);

  const getClassDetailLink = (cls: EnrichedFormClass) => `/classes/${cls.id}`;

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">Classes</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage classes across all levels and streams
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card">
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              className={`p-2 transition hover:scale-105 cursor-pointer ${
                view === 'grid'
                  ? 'bg-primary-gradient text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid size={18} />
            </button>

            <button
              onClick={() => setView('list')}
              aria-label="List view"
              className={`p-2 transition hover:scale-105 cursor-pointer ${
                view === 'list'
                  ? 'bg-primary-gradient text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List size={18} />
            </button>
          </div>

          {/* Create Button */}
          <Button
            onClick={() => setOpenCreate(true)}
            className="bg-primary-gradient text-white rounded-lg px-4 py-2 flex items-center gap-2 w-full sm:w-auto hover:scale-105 transition cursor-pointer"
          >
            <span className="text-xl">+</span>
            <span className="font-medium">Add Class</span>
          </Button>
        </div>
      </div>

      {/* LEVEL FILTER TABS */}
      <div className="flex items-center gap-2 border-b border-border pb-4 overflow-x-auto">
        <button
          onClick={() => setLevelFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition hover:scale-105 cursor-pointer whitespace-nowrap ${
            levelFilter === 'all'
              ? 'bg-primary-gradient text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Levels ({classes.length})
        </button>
        <button
          onClick={() => setLevelFilter('o-level')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 hover:scale-105 cursor-pointer whitespace-nowrap ${
            levelFilter === 'o-level'
              ? 'bg-primary-gradient text-white'
              : 'bg-o-level/10 text-o-level'
          }`}
        >
          <GraduationCap size={16} />
          O-Level ({classes.filter((c) => c.levelType === 'o-level').length})
        </button>
        <button
          onClick={() => setLevelFilter('a-level')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 hover:scale-105 cursor-pointer whitespace-nowrap ${
            levelFilter === 'a-level'
              ? 'bg-primary-gradient text-white'
              : 'bg-a-level/10 text-a-level'
          }`}
        >
          <GraduationCap size={16} />
          A-Level ({classes.filter((c) => c.levelType === 'a-level').length})
        </button>
      </div>

      {/* LIST OR GRID */}
      {filteredClasses.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            No classes yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {levelFilter === 'all'
              ? 'Get started by creating a new class or set up your academic levels first.'
              : `No ${levelFilter.toUpperCase()} classes found. Create one or check your ${levelFilter.toUpperCase()} structure.`}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Button
              onClick={() => setOpenCreate(true)}
              className="bg-primary-gradient text-white hover:scale-105 transition cursor-pointer"
            >
              Add Class
            </Button>
            <Link to="/levels/o-level">
              <Button variant="outline" className="hover:scale-105 transition cursor-pointer">
                Set Up O-Level
              </Button>
            </Link>
            <Link to="/levels/a-level">
              <Button variant="outline" className="hover:scale-105 transition cursor-pointer">
                Set Up A-Level
              </Button>
            </Link>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredClasses.map((c) => (
            <div
              key={c.id}
              className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-sm hover:shadow-lg transition flex flex-col justify-between gap-3"
            >
              <Link to={getClassDetailLink(c)} className="block space-y-3">
                <img
                  src="/assets/card_image.png"
                  className="w-full h-32 sm:h-36 object-cover rounded-lg"
                  alt={c.name}
                />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Class:</span>
                    <span className="text-foreground font-medium">{c.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Form:</span>
                    <span className="text-foreground">{c.formName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Stream:</span>
                    <span className="text-foreground">{c.streamName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Level:</span>
                    <span className="text-foreground">{c.levelName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                  <Users size={14} />
                  <span>{c.studentCount} students</span>
                </div>
              </Link>

              <div className="flex justify-between border-t border-border pt-3 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingClass(c);
                    setOpenEdit(true);
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:scale-105 transition"
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
              className="bg-card border border-border text-card-foreground p-4 rounded-lg shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <Link
                to={getClassDetailLink(c)}
                className="flex gap-4 items-center flex-1"
              >
                <img
                  src="/assets/card_image.png"
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  alt={c.name}
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-lg">
                      {c.name}
                    </h3>
                    <LevelBadge level={c.levelType} size="sm" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {c.formName} • {c.streamName} • {c.levelName}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:scale-105 transition"
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