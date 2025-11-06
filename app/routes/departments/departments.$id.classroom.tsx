import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { useState, useEffect } from 'react';
import {
  Link,
  useFetcher,
  useLoaderData,
  useParams,
  useRevalidator,
} from 'react-router';
import CreateClassModal from '~/components/modal/CreateClassModal';
import EditClassModal from '~/components/modal/EditClassModal';

export default function DepartmentClassrooms({
  classrooms = [],
}: {
  classrooms: any[];
}) {
  const { classrooms: initialClassrooms } = useLoaderData<{
    classrooms: any[];
  }>();
  const { id } = useParams();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null);

  const [localClassrooms, setLocalClassrooms] = useState(
    initialClassrooms || []
  );

  // Sync with loader data when it changes
  useEffect(() => {
    setLocalClassrooms(initialClassrooms || []);
  }, [initialClassrooms]);

  // Handle CRUD operations on local state
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      if (fetcher.data.classroom) {
        // CREATE or UPDATE
        const classroom = fetcher.data.classroom;
        setLocalClassrooms((prev) => {
          const exists = prev.find((c) => c.id === classroom.id);
          if (exists) {
            // Update existing classroom
            return prev.map((c) => (c.id === classroom.id ? classroom : c));
          } else {
            // Add new classroom
            return [...prev, classroom];
          }
        });
      } else {
        // DELETE - revalidate to get fresh data
        revalidator.revalidate();
      }
    }
    if (fetcher.data?.error) {
      console.error('Classroom operation error:', fetcher.data.error);
      alert(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  // Filter classrooms by search term only
  const filteredClassrooms = localClassrooms?.filter((c) => {
    if (!search.trim()) return true; // show all if search is empty
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between my-4 gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Department Classrooms
        </h1>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            title="Toggle View"
          >
            {view === 'grid' ? (
              <List className="h-4 w-4" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
          </Button>

          <Button
            className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Add Classroom
          </Button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search classrooms..."
            className="pl-10 bg-muted/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* CLASSROOM DISPLAY */}
      {filteredClassrooms?.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">No classrooms yet.</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredClassrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition"
            >
              <Link to={`/departments/${id}/classes/${classroom.id}`}>
                <img
                  src="/assets/card_image.png"
                  alt="card Image"
                  className="rounded-md"
                />
              </Link>

              <Link to={`/departments/${id}/classes/${classroom.id}`}>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs text-gray-900">
                      <strong>Name:</strong> {classroom.name}
                    </h3>
                    <p className="text-xs text-gray-900">
                      <strong>Year:</strong> {classroom.year}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-900">
                      <strong>Level:</strong> {classroom.EducationalLevel}
                    </p>
                    <p className="text-xs text-gray-900">
                      <strong>Section:</strong> {classroom.section}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                  <Users size={16} />
                  <span>{classroom.studentCount ?? 0} students</span>
                </div>
              </Link>

              <div className="flex items-center justify-between mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClassroom(classroom);
                    setEditModalOpen(true);
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:scale-110 transition"
                >
                  <Pencil size={16} /> Edit
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this classroom?')) {
                      const formData = new FormData();
                      formData.append('id', String(classroom.id));
                      formData.append('_method', 'DELETE');
                      formData.append('_entity', 'class');
                      fetcher.submit(formData, { 
                        method: 'POST'
                      });
                    }
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:scale-110 transition"
                >
                  <Trash2 size={16} /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClassrooms.map((classroom) => (
            <div
              key={classroom.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
            >
              <Link
                to={`/departments/${id}/classes/${classroom.id}`}
                className="flex items-center gap-4 flex-1"
              >
                <img
                  src="/assets/card_image.png"
                  alt="card Image"
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {classroom.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {classroom.EducationalLevel} - Section {classroom.section} -
                    Year {classroom.year}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users size={16} />
                <span>{classroom.studentCount ?? 0} students</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClassroom(classroom);
                    setEditModalOpen(true);
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:scale-110 transition"
                >
                  <Pencil size={16} /> Edit
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this classroom?')) {
                      const formData = new FormData();
                      formData.append('id', String(classroom.id));
                      formData.append('_method', 'DELETE');
                      formData.append('_entity', 'class');
                      fetcher.submit(formData, { 
                        method: 'POST'
                      });
                    }
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:scale-110 transition"
                >
                  <Trash2 size={16} /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {addModalOpen && (
        <CreateClassModal
          open={addModalOpen}
          setOpen={setAddModalOpen}
          fetcher={fetcher}
          id={id}
        />
      )}

      {editModalOpen && selectedClassroom && (
        <EditClassModal
          open={editModalOpen}
          setOpen={setEditModalOpen}
          editingClass={selectedClassroom}
          fetcher={fetcher}
          id={id}
        />
      )}
    </>
  );
}

