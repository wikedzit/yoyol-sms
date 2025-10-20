import { useEffect, useState } from 'react';
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

// 🧠 Loader – fetch classes
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services;
  const classes = await services.class.getAll({
    offset: 0,
    sortBy: 'name',
    sortOrder: 'asc',
    search: '',
    limit: 100,
  });
  return { classes };
}

// ⚙️ Action – handle create, update, delete
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services;
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    if (method === 'POST') {
      const name = form.get('name');
      if (!name || typeof name !== 'string') {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const created = await services.class.create({ name });
      return { success: true, class: created };
    }

    if (method === 'PUT') {
      const id = form.get('id');
      const name = form.get('name');
      if (!id || !name)
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      const updated = await services.class.update(parseInt(String(id)), {
        name: String(name),
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
  const { classes: initialClasses } = useLoaderData() as { classes: any[] };
  const fetcher = useFetcher();
  const listFetcher = useFetcher();
  const [classes, setClasses] = useState(initialClasses ?? []);
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid'); // 🟢 Add view state

  useEffect(() => {
    if (listFetcher.data?.classes) {
      setClasses(listFetcher.data.classes);
    }
  }, [listFetcher.data]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;
      if (data.error) {
        setToast(`Error: ${data.error}`);
        return;
      }
      if (data.success) {
        if (data.class && !editingClass) {
          setClasses((prev) => [data.class, ...prev]);
          setToast('Class added successfully.');
        }
        if (data.class && editingClass) {
          setClasses((prev) =>
            prev.map((c) => (c.id === data.class.id ? data.class : c))
          );
          setToast('Class updated successfully.');
        }
        if (data.success && !data.class && !editingClass) {
          const deletedId = fetcher.formData?.get('id');
          if (deletedId) {
            setClasses((prev) =>
              prev.filter((c) => c.id !== Number(deletedId))
            );
          }
          setToast('Class deleted successfully.');
        }
        setEditingClass(null);
        listFetcher.load(window.location.pathname);
      }
      const timeout = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timeout);
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
                view === 'grid' ? 'bg-primary text-white' : 'text-gray-500'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 ${
                view === 'list' ? 'bg-primary text-white' : 'text-gray-500'
              }`}
            >
              <List size={18} />
            </button>
          </div>

          {/* Create button */}
          <Button
            onClick={() => setOpenCreate(true)}
            className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
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
                to={`/classrooms/${c.id}`}
                key={c.id}
                className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition"
              >
                <img src="assets/card_image.png" alt="card Image" />
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {c.name}
                  </h3>
                  <GraduationCap className="text-primary" size={22} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault(); // prevent navigation
                      setEditingClass(c);
                      setOpenEdit(true);
                    }}
                    className="flex items-center gap-2 border-none shadow-none text-gray-200 hover:bg-purple-100 hover:text-purple-900 cursor-pointer"
                  >
                    <Pencil size={16} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenDelete(true);
                    }}
                    className="flex items-center gap-2 text-gray-200 hover:text-red-800 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </Button>
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
              to={`/classrooms/${c.id}`}
              key={c.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-gradient rounded-lg flex items-center justify-center">
                  <GraduationCap size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {c.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {c.description || 'No description provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>0 students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingClass(c);
                    setOpenEdit(true);
                  }}
                  className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-900"
                >
                  <Pencil size={16} />
                  <span>Edit</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    fetcher.submit({ id: c.id }, { method: 'DELETE' });
                  }}
                  className="flex items-center gap-2 text-red-600 hover:text-red-800"
                >
                  <Trash size={16} />
                  <span>Delete</span>
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-500 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
