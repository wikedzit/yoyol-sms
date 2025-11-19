import { useEffect, useRef, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Navigate, useFetcher, useLoaderData, useNavigate } from 'react-router';
import { Card } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  BookOpen,
  Users,
  Calendar,
  ChevronRight,
  Plus,
  Pencil,
  Eye,
} from 'lucide-react';
import type CourseService from 'workers/services/courses';
import type DepartmentService from 'workers/services/departments';
import AddCourseModal from '~/components/modal/AddCourseModal';
import EditCourseModal from '~/components/modal/EditCourseModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { toast } from 'sonner';

// --- Loader: fetch courses ---
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    course: CourseService;
    department: DepartmentService;
  };
  const courses = await services.course.getCourses({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const departments = await services.department.getDepartments({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  return { courses, departments };
}

// --- Action: handle create, update, delete ---
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as { course: CourseService };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    // CREATE
    if (method === 'POST') {
      const data = {
        name: String(form.get('name') ?? ''),
        code: String(form.get('code') ?? ''),
        duration: String(form.get('duration') ?? ''),
        totalStudent: Number(form.get('totalStudent') ?? 0),
        status: String(form.get('status') ?? 'Active') as 'Active' | 'Inactive',
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        departmentId: form.get('departmentId')
          ? Number(form.get('departmentId'))
          : undefined,
      };
      const created = await services.course.createCourse(data);
      return { success: true, course: created };
    }

    // UPDATE
    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) return { error: 'Course ID is required' };
      const data = {
        name: String(form.get('name') ?? ''),
        code: String(form.get('code') ?? ''),
        duration: String(form.get('duration') ?? ''),
        totalStudent: Number(form.get('totalStudent') ?? 0),
        status: String(form.get('status') ?? 'Active') as 'Active' | 'Inactive',
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        departmentId: form.get('departmentId')
          ? Number(form.get('departmentId'))
          : undefined,
      };
      const updated = await services.course.updateCourse(String(id), data);
      return { success: true, course: updated };
    }

    // DELETE
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) return { error: 'Course ID is required' };
      await services.course.deleteCourse(String(id));
      return { success: true, id }; // return deleted id
    }

    return { error: 'Unknown method' };
  } catch (err: any) {
    console.error('courses action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

// --- Course Page Component ---
const CoursePage = () => {
  const { courses: initialCourses, departments: initialDepartments } =
    useLoaderData<{
      courses: any[];
      departments: any[];
    }>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const listFetcher = useFetcher();

  const [courses, setCourses] = useState(initialCourses);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  // Update local state after successful fetcher submission
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      lastMethod.current = method ?? fetcher.formMethod;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // Show toast on completion
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      fetcher.load(window.location.pathname); // refresh list after any action
      const data = fetcher.data;

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        listFetcher.load(window.location.pathname);
        return;
      }

      if (data.success) {
        switch (lastMethod.current) {
          case 'POST':
            toast.success('Course added successfully!');
            setCourses((prev) => [...prev, data.course]);
            listFetcher.load(window.location.pathname);
            break;
          case 'PUT':
            toast.success('Course updated successfully!');
            setCourses((prev) =>
              prev.map((c) => (c.id === data.course.id ? data.course : c))
            );
            listFetcher.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.error('Course deleted successfully!');
            setCourses((prev) => prev.filter((c) => c.id !== data.id));
            listFetcher.load(window.location.pathname);
            break;
          default:
            toast.success('Action completed successfully.');
            listFetcher.load(window.location.pathname);
        }

        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  // if listFetcher has fresh loader data, sync local state (keeps counts, nested info up-to-date)
  useEffect(() => {
    if (listFetcher.state !== 'idle' || !listFetcher.data) return;
    setCourses(listFetcher.data.courses);
  }, [listFetcher.state, listFetcher.data]);

  const statusColors = {
    Active: 'bg-success text-white',
    Inactive: 'bg-muted text-muted-foreground',
    Draft: 'bg-warning text-white',
  };

  const handleOpenAddDialog = () => {
    setIsAddCourseModalOpen(true);
  };

  const handleEditModalOpen = (course: any) => {
    setSelectedCourse(course);
    setIsEditCourseModalOpen(true);
  };

  const getDepartmentName = (departmentId: number | null) => {
    if (!departmentId) return '—';
    const dept = initialDepartments.find((d) => d.id === departmentId);
    return dept?.name || '—';
  };

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Courses
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage and view all academic programs
          </p>
        </div>

        <div>
          <Button
            onClick={handleOpenAddDialog}
            className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
        {courses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No courses found.</p>
          </div>
        ) : (
          courses.map((course) => (
            <Card
              key={course.id}
              className="p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer group border-none shadow-sm flex flex-col justify-between gap-3"
              onClick={() => navigate(`${course.id}`)}
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {course.name}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {course.code}
                  </p>
                  <Badge className="text-xs">{course.status}</Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                Department: {getDepartmentName(course.departmentId)}
              </p>

              {/* COURSE INFO */}
              <div className="space-y-1 mt-1">
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{course.totalStudent || 0} Students</span>
                </div>

                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{course.duration}</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between gap-3 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="plain"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditModalOpen(course);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <div onClick={(e) => e.stopPropagation()}>
                    <DeleteStudentButton
                      id={String(course.id)}
                      name={course.name}
                      fetcher={fetcher}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* MODALS */}
      {isAddCourseModalOpen && (
        <AddCourseModal
          open={isAddCourseModalOpen}
          setOpen={setIsAddCourseModalOpen}
          fetcher={fetcher}
          departments={initialDepartments}
        />
      )}

      {isEditCourseModalOpen && selectedCourse && (
        <EditCourseModal
          open={isEditCourseModalOpen}
          setOpen={setIsEditCourseModalOpen}
          fetcher={fetcher}
          course={selectedCourse}
          departments={initialDepartments}
        />
      )}
    </div>
  );
};

export default CoursePage;
