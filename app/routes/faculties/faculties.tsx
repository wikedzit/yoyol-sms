import { useState, useEffect, useRef } from 'react';
import { Link, useLoaderData, useFetcher } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import {
  Search,
  Plus,
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  Eye,
  Pencil,
  Trash2,
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

// --- Loader: fetch faculties ---
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

// --- Action: handle create, update, delete ---
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as { faculty: FacultyService };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    // CREATE
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
      if (!created) {
        return { error: 'Failed to create faculty' };
      }
      return { success: true, faculty: created };
    }

    // UPDATE
    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) return { error: 'Faculty ID is required' };
      const data = {
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
      const updated = await services.faculty.updateFaculty(String(id), data);
      if (!updated) {
        return { error: 'Failed to update faculty' };
      }
      return { success: true, faculty: updated };
    }

    // DELETE
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) return { error: 'Faculty ID is required' };
      const deleted = await services.faculty.deleteFaculty(String(id));
      if (!deleted) {
        return { error: 'Failed to delete faculty' };
      }
      return { success: true, id }; // return deleted id
    }

    return { error: 'Unknown method' };
  } catch (err: any) {
    console.error('faculties action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

const FacultiesPage = () => {
  const { faculties: initialFaculties } = useLoaderData<{
    faculties: FacultyWithStats[];
  }>();
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);

  const [faculties, setFaculties] =
    useState<FacultyWithStats[]>(initialFaculties);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFacultyModalOpen, setIsAddFacultyModalOpen] = useState(false);
  const [isEditFacultyModalOpen, setIsEditFacultyModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] =
    useState<FacultyWithStats | null>(null);

  // Update local state after successful fetcher submission
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      lastMethod.current = method ?? fetcher.formMethod;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // Show toast on completion
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        return;
      }

      if (data.success) {
        switch (lastMethod.current) {
          case 'POST':
            toast.success('Faculty added successfully!');
            // Add the new faculty with default stats
            setFaculties((prev) => [
              ...prev,
              { ...data.faculty, departments: 0, courses: 0 },
            ]);
            break;
          case 'PUT':
            toast.success('Faculty updated successfully!');
            setFaculties((prev) =>
              prev.map((f) =>
                f.id === data.faculty.id
                  ? {
                      ...data.faculty,
                      departments: f.departments,
                      courses: f.courses,
                    }
                  : f
              )
            );
            break;
          case 'DELETE':
            toast.success('Faculty deleted successfully!');
            setFaculties((prev) => prev.filter((f) => f.id !== data.id));
            break;
          default:
            toast.success('Action completed successfully.');
        }

        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  const filteredFaculties = faculties.filter(
    (faculty) =>
      faculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faculty.dean || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAddDialog = () => {
    setIsAddFacultyModalOpen(true);
  };

  const handleEditModalOpen = (faculty: FacultyWithStats) => {
    setSelectedFaculty(faculty);
    setIsEditFacultyModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Faculty Management
            </h1>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by faculty name, code, or dean..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="default"
                className="gap-2"
                onClick={handleOpenAddDialog}
              >
                <Plus className="h-4 w-4" />
                Add Faculty
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Faculties</CardDescription>
              <CardTitle className="text-3xl">{faculties.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Faculties</CardDescription>
              <CardTitle className="text-3xl">
                {faculties.filter((f) => f.status === 'active').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Departments</CardDescription>
              <CardTitle className="text-3xl">
                {faculties.reduce((acc, f) => acc + f.departments, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Courses</CardDescription>
              <CardTitle className="text-3xl">
                {faculties.reduce((acc, f) => acc + f.courses, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Faculty Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFaculties.map((faculty) => (
            <Card
              key={faculty.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
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
                    <CardTitle className="text-xl mb-1">
                      {faculty.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      Dean: {faculty.dean}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Departments:</span>
                    <span className="font-semibold">{faculty.departments}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Courses:</span>
                    <span className="font-semibold">{faculty.courses}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {/* <Link to={`/faculties/${faculty.id}`} className="flex-1"> */}
                  <Link to="#">
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
                    Edit
                  </Button>
                  <DeleteStudentButton
                    id={faculty.id}
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

        {/* Pagination placeholder */}
        {filteredFaculties.length > 0 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-primary text-primary-foreground"
            >
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
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
