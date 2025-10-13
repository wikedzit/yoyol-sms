import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { DeleteClassButton } from '~/components/modal/Delete';
import { Button } from '~/components/ui/button';

// 🟣 Import the modals
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
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
        // CREATE
        if (data.class && !editingClass) {
          setClasses((prev) => [data.class, ...prev]);
          setToast('Class added successfully.');
        }

        // UPDATE
        if (data.class && editingClass) {
          setClasses((prev) =>
            prev.map((c) => (c.id === data.class.id ? data.class : c))
          );
          setToast('Class updated successfully.');
        }

        // DELETE
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
    <div className="p-10">
      <h1 className="text-2xl font-semibold mb-6">
        {classes.length} Classrooms
      </h1>

      {/* 🧱 Classroom Grid */}
      {classes.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">No classrooms yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {classes.map((classItem: any) => (
            <div
              key={classItem.id}
              className="relative bg-white shadow-sm rounded-2xl p-5 text-center hover:shadow-md transition"
            >
              <DeleteClassButton
                id={classItem.id}
                name={classItem.name}
                fetcher={fetcher}
              />
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏫</span>
              </div>
              <h2 className="font-semibold text-lg text-gray-800 mb-1">
                {classItem.name}
              </h2>
              <p className="text-sm text-gray-500">
                Contains {classItem.studentCount} students
              </p>
              <button
                onClick={() => {
                  setEditingClass(classItem);
                  setOpenEdit(true);
                }}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                ✏️ Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 🟣 Create Modal */}
      <CreateClassModal
        open={openCreate}
        setOpen={setOpenCreate}
        fetcher={fetcher}
      />

      {/* 🟢 Edit Modal */}
      <EditClassModal
        open={openEdit}
        setOpen={setOpenEdit}
        fetcher={fetcher}
        editingClass={editingClass}
      />

      {/* ✅ Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-500 animate-fade-in">
          {toast}
        </div>
      )}

      {/* ➕ Add Button */}
      <div className="fixed bottom-6 left-10 z-50">
        <Button
          onClick={() => setOpenCreate(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-md shadow-lg flex items-center gap-2"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="font-medium">Add new classroom</span>
        </Button>
      </div>
    </div>
  );
}
