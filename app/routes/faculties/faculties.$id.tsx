import {
  Link,
  useParams,
  useLoaderData,
  useFetcher,
  useRevalidator,
} from 'react-router-dom';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { ChevronRight, Home, BookOpen, Users, Search } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

import type FacultyService from 'workers/services/faculties';
import type DepartmentService from 'workers/services/departments';
import type TeacherService from 'workers/services/teachers';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// --- Loader: fetch faculty, departments, and teachers ---
export async function loader({ context, params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response('Faculty ID required', { status: 400 });

  const services = context.services as {
    faculty: FacultyService;
    department: DepartmentService;
    teacher: TeacherService;
  };

  // Fetch faculty
  const faculty = await services.faculty.getFacultyById(id);
  if (!faculty) {
    throw new Response('Faculty not found', { status: 404 });
  }

  // Fetch departments by faculty ID (currently assigned)
  const assignedDepartments =
    await services.department.getDepartmentsByFacultyId(Number(id));
  console.log({ assignedDepartments: assignedDepartments });

  // Fetch teachers by faculty ID (through departments)
  const teachers = await services.teacher.getTeachersByFacultyId(Number(id));

  return {
    faculty,
    assignedDepartments,
    departments: assignedDepartments, // Keep for backward compatibility
    teachers,
  };
}

// --- Action: handle department assignment ---
export async function action({ request, context, params }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response('Faculty ID required', { status: 400 });

  const services = context.services as {
    department: DepartmentService;
  };

  const form = await request.formData();
  const actionType = form.get('action');

  try {
    if (actionType === 'assign_departments') {
      const departmentIdsJson = form.get('departmentIds');
      if (!departmentIdsJson) {
        return { error: 'Department IDs are required' };
      }

      const departmentIds = JSON.parse(departmentIdsJson as string) as number[];
      const facultyId = Number(id);

      // Update each department's facultyId
      for (const departmentId of departmentIds) {
        await services.department.updateDepartment(String(departmentId), {
          facultyId: facultyId,
        });
      }

      // Remove facultyId from departments not in the list
      // First, get all departments currently assigned to this faculty
      const currentlyAssigned =
        await services.department.getDepartmentsByFacultyId(facultyId);
      const currentlyAssignedIds = new Set(currentlyAssigned.map((d) => d.id));
      const newAssignedIds = new Set(departmentIds);

      // Find departments to remove (set facultyId to null)
      for (const dept of currentlyAssigned) {
        if (!newAssignedIds.has(dept.id)) {
          await services.department.updateDepartment(String(dept.id), {
            facultyId: null,
          });
        }
      }

      return { success: true };
    }

    return { error: 'Unknown action' };
  } catch (err: any) {
    console.error('Faculty departments action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

const FacultyDetails = () => {
  const { id } = useParams();
  const { faculty, assignedDepartments, departments, teachers } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  // const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);

  // Initialize selected departments with currently assigned ones
  useEffect(() => {
    setSelectedDepartments(assignedDepartments.map((d) => d.id));
  }, [assignedDepartments]);

  // Show toast on assignment completion
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.success) {
        toast.success('Departments assigned successfully!');
        // setIsAssignModalOpen(false);
        // Reload the page data
        revalidator.revalidate();
      } else if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  const handleToggleDepartment = (departmentId: number) => {
    setSelectedDepartments((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleAssignDepartments = () => {
    const formData = new FormData();
    formData.append('action', 'assign_departments');
    formData.append('departmentIds', JSON.stringify(selectedDepartments));

    fetcher.submit(formData, {
      method: 'post',
      action: `/faculties/${id}`,
    });
  };

  // Filter departments
  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(departmentSearchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(departmentSearchQuery.toLowerCase()) ||
      (dept.headOfDepartment || '')
        .toLowerCase()
        .includes(departmentSearchQuery.toLowerCase())
  );

  // Filter teachers
  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.firstName
        .toLowerCase()
        .includes(teacherSearchQuery.toLowerCase()) ||
      teacher.lastName
        .toLowerCase()
        .includes(teacherSearchQuery.toLowerCase()) ||
      teacher.subject
        .toLowerCase()
        .includes(teacherSearchQuery.toLowerCase()) ||
      (teacher.email || '')
        .toLowerCase()
        .includes(teacherSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              to="/faculties"
              className="hover:text-foreground transition-colors"
            >
              Faculties
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{faculty.name}</span>
          </nav>
        </div>
      </div>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="font-mono">
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
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {faculty.name}
              </h1>
              {faculty.description && (
                <p className="text-muted-foreground max-w-3xl">
                  {faculty.description}
                </p>
              )}
            </div>
          </div>

          {/* Dean Info Card */}
          {faculty.dean && (
            <Card className="bg-accent/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Dean of Faculty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{faculty.dean}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="departments" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          {/* Departments Tab */}
          <TabsContent value="departments" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Departments</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search departments..."
                        className="pl-10"
                        value={departmentSearchQuery}
                        onChange={(e) =>
                          setDepartmentSearchQuery(e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">
                        Head of Department
                      </TableHead>
                      <TableHead className="font-semibold">Students</TableHead>
                      <TableHead className="font-semibold">
                        Established
                      </TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDepartments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No departments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDepartments.map((department) => (
                        <TableRow key={department.id}>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {department.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {department.name}
                          </TableCell>
                          <TableCell>
                            {department.headOfDepartment || '—'}
                          </TableCell>
                          <TableCell>{department.totalStudent || 0}</TableCell>
                          <TableCell>
                            {department.establishedDate || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                department.status === 'Active'
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {department.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab - Placeholder for future implementation */}
          <TabsContent value="courses" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Courses</CardTitle>
                <CardDescription>
                  Course management will be available soon.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Course data will be displayed here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Teachers</CardTitle>
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search teachers..."
                      className="pl-10"
                      value={teacherSearchQuery}
                      onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold">SN</TableHead>
                      <TableHead className="font-semibold">
                        First Name
                      </TableHead>
                      <TableHead className="font-semibold">Last Name</TableHead>
                      <TableHead className="font-semibold">Subject</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No teachers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTeachers.map((teacher, index) => (
                        <TableRow key={teacher.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {teacher.firstName}
                          </TableCell>
                          <TableCell className="font-medium">
                            {teacher.lastName}
                          </TableCell>
                          <TableCell>{teacher.subject}</TableCell>
                          <TableCell>{teacher.email || '—'}</TableCell>
                          <TableCell>{teacher.phone || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                teacher.status === 'Active'
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {teacher.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FacultyDetails;
