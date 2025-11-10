import { useEffect, useRef, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useFetcher, useLoaderData } from 'react-router';
import { Button } from '~/components/ui/button';
import { Plus } from 'lucide-react';
import { CourseHeader } from '~/components/course/CourseHeader';
import { YearCard } from '~/components/course/YearCard';
import AddYearModal from '~/components/modal/AddYearModal';
import EditYearModal from '~/components/modal/EditYearModal';
import type CourseService from 'workers/services/courses';
import type YearService from 'workers/services/years';
import type DepartmentService from 'workers/services/departments';
import { toast } from 'sonner';

// --- Loader: fetch course and years ---
export async function loader({ params, context }: LoaderFunctionArgs) {
  const services = context.services as {
    course: CourseService;
    year: YearService;
    department: DepartmentService;
  };

  const courseId = params.id;
  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  const course = await services.course.getCourseById(courseId);
  if (!course) {
    throw new Response('Course not found', { status: 404 });
  }

  const years = await services.year.getYearsByCourseId(parseInt(courseId));

  // Get department name if available
  let departmentName = '—';
  if (course.departmentId) {
    const department = await services.department.getDepartmentById(
      String(course.departmentId)
    );
    departmentName = department?.name || '—';
  }

  return {
    course: {
      ...course,
      department: departmentName,
    },
    years,
  };
}

// --- Action: handle create, update, delete for years ---
export async function action({ request, params, context }: ActionFunctionArgs) {
  const services = context.services as { year: YearService };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  const courseId = params.id;

  if (!courseId) {
    return { error: 'Course ID is required' };
  }

  try {
    // CREATE
    if (method === 'POST') {
      const data = {
        yearNumber: Number(form.get('yearNumber') ?? 1),
        name: String(form.get('name') ?? ''),
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
        courseId: parseInt(courseId),
      };
      const created = await services.year.createYear(data);
      if (!created) {
        return { error: 'Failed to create year' };
      }
      return { success: true, year: created };
    }

    // UPDATE
    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) return { error: 'Year ID is required' };
      const data = {
        yearNumber: form.get('yearNumber')
          ? Number(form.get('yearNumber'))
          : undefined,
        name: form.get('name') ? String(form.get('name')) : undefined,
        description: form.get('description')
          ? String(form.get('description'))
          : undefined,
      };
      const updated = await services.year.updateYear(String(id), data);
      if (!updated) {
        return { error: 'Failed to update year' };
      }
      return { success: true, year: updated };
    }

    // DELETE
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) return { error: 'Year ID is required' };
      const deleted = await services.year.deleteYear(String(id));
      if (!deleted) {
        return { error: 'Failed to delete year' };
      }
      return { success: true, id };
    }

    return { error: 'Unknown method' };
  } catch (err: any) {
    console.error('years action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

// --- Course Page Details Component ---
export default function CoursePageDetails() {
  const { course, years: initialYears } = useLoaderData<{
    course: any;
    years: any[];
  }>();
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const [years, setYears] = useState(initialYears);
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [isEditYearModalOpen, setIsEditYearModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<any>(null);

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
            toast.success('Year added successfully!');
            setYears((prev) => [...prev, data.year]);
            break;
          case 'PUT':
            toast.success('Year updated successfully!');
            setYears((prev) =>
              prev.map((y) => (y.id === data.year.id ? data.year : y))
            );
            break;
          case 'DELETE':
            toast.success('Year deleted successfully!');
            setYears((prev) => prev.filter((y) => y.id !== data.id));
            break;
          default:
            toast.success('Action completed successfully.');
        }

        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  const handleOpenAddModal = () => {
    setIsAddYearModalOpen(true);
  };

  const handleOpenEditModal = (year: any) => {
    setSelectedYear(year);
    setIsEditYearModalOpen(true);
  };

  return (
    <div>
      <CourseHeader
        name={course.name}
        code={course.code}
        duration={course.duration}
        department={course.department}
        status={course.status}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-foreground">
          Course Structure
        </h2>
        <Button
          variant="default"
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
          onClick={handleOpenAddModal}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Year
        </Button>
      </div>

      <div className="space-y-4">
        {years.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No years found. Add a year to get started.
            </p>
          </div>
        ) : (
          years.map((year) => (
            <YearCard
              key={year.id}
              year={year.yearNumber}
              yearId={year.id}
              yearName={year.name}
              yearData={year}
              semesters={[]} // Leave semesters empty for now
              fetcher={fetcher}
              onEdit={handleOpenEditModal}
            />
          ))
        )}
      </div>

      {/* Add/Edit Year Modals */}
      {isAddYearModalOpen && (
        <AddYearModal
          open={isAddYearModalOpen}
          setOpen={setIsAddYearModalOpen}
          fetcher={fetcher}
          courseId={course.id}
          existingYears={years}
        />
      )}

      {isEditYearModalOpen && selectedYear && (
        <EditYearModal
          open={isEditYearModalOpen}
          setOpen={setIsEditYearModalOpen}
          fetcher={fetcher}
          year={selectedYear}
        />
      )}
    </div>
  );
}
