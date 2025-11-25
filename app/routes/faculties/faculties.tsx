import { useState, useEffect, useRef } from 'react';
import { Link, useLoaderData, useFetcher } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import {
  Search,
  Plus,
  Building2,
  BookOpen,
  Users,
  Eye,
  Pencil,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import AddFacultyModal from '~/components/modal/AddFacultyModal';
import EditFacultyModal from '~/components/modal/EditFacultyModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { toast } from 'sonner';
import type FacultyService from 'workers/services/faculties';
import type { FacultyWithStats } from 'workers/services/faculties';

export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as { faculty: FacultyService };
  const faculties = await services.faculty.getFacultiesWithStats({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });
  return { faculties };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as { faculty: FacultyService };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    if (method === 'POST') {
      const data = {
        name: String(form.get('name') ?? ''),
        code: String(form.get('code') ?? ''),
        dean: form.get('dean') ? String(form.get('dean')) : undefined,
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        status: String(form.get('status') ?? 'active') as 'active' | 'inactive',
      };

      const created = await services.faculty.createFaculty(data);
      return { success: true, faculty: { ...created } };
    }

    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) return { error: 'ID is required' };
      const payload = {
        name: form.get('name') ? String(form.get('name')) : undefined,
        code: form.get('code') ? String(form.get('code')) : undefined,
        dean: form.get('dean') ? String(form.get('dean')) : undefined,
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        status: form.get('status')
          ? (String(form.get('status')) as 'active' | 'inactive')
          : undefined,
      };

      const updated = await services.faculty.updateFaculty(String(id), payload);
      return { success: true, faculty: { ...updated } };
    }

    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) return { error: 'ID is required' };
      await services.faculty.deleteFaculty(String(id));
      return { success: true, id: String(id) };
    }

    return { error: 'Unknown method' };
  } catch (err: any) {
    console.error('faculties.action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

const FacultiesPage = () => {
  const { faculties: initialFaculties } = useLoaderData<{
    faculties: FacultyWithStats[];
  }>();
  const fetcher = useFetcher();
  const listFetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);

  const [faculties, setFaculties] =
    useState<FacultyWithStats[]>(initialFaculties);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFacultyModalOpen, setIsAddFacultyModalOpen] = useState(false);
  const [isEditFacultyModalOpen, setIsEditFacultyModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] =
    useState<FacultyWithStats | null>(null);

  // track submitted method
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = (fetcher.formData.get('_method') as string | null) ?? null;
      lastMethod.current = method ?? fetcher.formMethod ?? null;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // react on finished action
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const data = fetcher.data;
    fetcher.load(window.location.pathname); // refresh list after any action

    if (data.error) {
      toast.error(data.error || 'An error occurred.');
      lastMethod.current = null;
      return;
    }

    if (data.success) {
      switch (lastMethod.current) {
        case 'POST':
          toast.success('Faculty added successfully!');
          // immediate optimistic update
          setFaculties((prev) => [
            ...prev,
            {
              ...data.faculty,
              departments: data.faculty.departments ?? 0,
              courses: data.faculty.courses ?? 0,
            },
          ]);
          // keep server-of-truth in sync (optional)
          listFetcher.load(window.location.pathname);
          break;

        case 'PUT':
          toast.success('Faculty updated successfully!');
          setFaculties((prev) =>
            prev.map((f) =>
              f.id === data.faculty.id
                ? {
                    ...data.faculty,
                    departments: f.departments, // preserve counts if server didn't return them
                    courses: f.courses,
                  }
                : f
            )
          );
          listFetcher.load(window.location.pathname);
          break;

        case 'DELETE':
          toast.error('Faculty deleted successfully!');
          setFaculties((prev) => prev.filter((f) => f.id !== data.id));
          listFetcher.load(window.location.pathname);
          break;

        default:
          // fallback: refresh list
          listFetcher.load(window.location.pathname);
      }

      lastMethod.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  // if listFetcher has fresh loader data, sync local state (keeps counts, nested info up-to-date)
  useEffect(() => {
    if (listFetcher.state === 'idle' && listFetcher.data?.faculties) {
      setFaculties(listFetcher.data.faculties);
    }
  }, [listFetcher.state, listFetcher.data]);

  const filteredFaculties = faculties.filter(
    (faculty) =>
      faculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faculty.dean || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditModalOpen = (faculty: FacultyWithStats) => {
    setSelectedFaculty(faculty);
    setIsEditFacultyModalOpen(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold text-foreground">
              Faculty Management
            </h1>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="default"
                className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
                onClick={() => setIsAddFacultyModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Faculty
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="">
        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8 ">
          <Card className="border-none shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>Total Faculties</CardDescription>
              <CardTitle className="text-3xl">{faculties.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>Active Faculties</CardDescription>
              <CardTitle className="text-3xl">
                {faculties.filter((f) => f.status === 'active').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>Total Departments</CardDescription>
              <CardTitle className="text-3xl">
                {faculties.reduce((acc, f) => acc + (f.departments || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-none">
            <CardHeader className="pb-3">
              <CardDescription>Total Courses</CardDescription>
              <CardTitle className="text-3xl">
                {faculties.reduce((acc, f) => acc + (f.courses || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Faculty Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFaculties.map((faculty) => (
            <Card
              key={faculty.id}
              className="border-none shadow-none hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">
                      {faculty.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Dean: {faculty.dean}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {faculty.code}
                  </Badge>
                  <Badge
                    variant={
                      faculty.status === 'active' ? 'default' : 'secondary'
                    }
                  >
                    {faculty.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Departments:</span>
                    <span className="font-semibold">
                      {faculty.departments || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Courses:</span>
                    <span className="font-semibold">
                      {faculty.courses || 0}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Link to={`/faculties/${faculty.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleEditModalOpen(faculty)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DeleteStudentButton
                    id={String(faculty.id)}
                    name={faculty.name}
                    fetcher={fetcher}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFaculties.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">
                No faculties found matching your search.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* add faculty modal */}
      {isAddFacultyModalOpen && (
        <AddFacultyModal
          open={isAddFacultyModalOpen}
          setOpen={setIsAddFacultyModalOpen}
          fetcher={fetcher}
        />
      )}

      {/* edit faculty modal */}
      {isEditFacultyModalOpen && selectedFaculty && (
        <EditFacultyModal
          open={isEditFacultyModalOpen}
          setOpen={setIsEditFacultyModalOpen}
          fetcher={fetcher}
          faculty={selectedFaculty}
        />
      )}
    </div>
  );
};

export default FacultiesPage;
