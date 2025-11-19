import { useEffect, useRef, useState } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useFetcher, useLoaderData, useRevalidator } from 'react-router';
import { Button } from '~/components/ui/button';
import { Plus } from 'lucide-react';
import { CourseHeader } from '~/components/course/CourseHeader';
import { YearCard } from '~/components/course/YearCard';
import AddYearModal from '~/components/modal/AddYearModal';
import EditYearModal from '~/components/modal/EditYearModal';
import type CourseService from 'workers/services/courses';
import type YearService from 'workers/services/years';
import type DepartmentService from 'workers/services/departments';
import type SemesterService from 'workers/services/semesters';
import type SemesterSubjectService from 'workers/services/semester-subjects';
import type SubjectService from 'workers/services/subjects';
import { toast } from 'sonner';

// --- Loader: fetch course and years with semesters and subjects ---
export async function loader({ params, context }: LoaderFunctionArgs) {
  const services = context.services as {
    course: CourseService;
    year: YearService;
    department: DepartmentService;
    semester: SemesterService;
    semesterSubject: SemesterSubjectService;
    subject: SubjectService;
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

  // Load semesters for each year with their subjects
  const yearsWithSemesters = await Promise.all(
    years.map(async (year) => {
      const semesters = await services.semester.getSemestersByYearId(year.id);
      const semestersWithSubjects = await Promise.all(
        semesters.map(async (semester) => {
          const subjects = await services.semesterSubject.getSubjectsBySemester(
            semester.id
          );
          return {
            ...semester,
            subjects: subjects.map((s) => ({
              id: String(s.id),
              name: s.subjectName,
              code: s.code,
              credits: 0, // Add credits field if needed
              lecturer: s.instructor,
            })),
          };
        })
      );

      return {
        ...year,
        semesters: semestersWithSubjects,
      };
    })
  );

  // Get department name if available
  let departmentName = '—';
  if (course.departmentId) {
    const department = await services.department.getDepartmentById(
      String(course.departmentId)
    );
    departmentName = department?.name || '—';
  }

  // Get all subjects for assignment modals
  const allSubjects = await services.subject.getAllSubjects({
    limit: 1000,
    sortBy: 'subjectName',
    sortOrder: 'asc',
  });

  return {
    course: {
      ...course,
      department: departmentName,
    },
    years: yearsWithSemesters,
    subjects: allSubjects,
  };
}

// --- Action: handle create, update, delete for years and semesters ---
export async function action({ request, params, context }: ActionFunctionArgs) {
  const services = context.services as {
    year: YearService;
    semester: SemesterService;
    semesterSubject: SemesterSubjectService;
  };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  const courseId = params.id;
  const entity = form.get('_entity') as string;

  if (!courseId) {
    return { error: 'Course ID is required' };
  }

  try {
    // ========== YEAR OPERATIONS ==========
    if (entity === 'year' || !entity) {
      // CREATE YEAR
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

      // UPDATE YEAR
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

      // DELETE YEAR
      if (method === 'DELETE') {
        const id = form.get('id');
        if (!id) return { error: 'Year ID is required' };
        const deleted = await services.year.deleteYear(String(id));
        if (!deleted) {
          return { error: 'Failed to delete year' };
        }
        return { success: true, id };
      }
    }

    // ========== SEMESTER OPERATIONS ==========
    if (entity === 'semester') {
      // CREATE SEMESTER
      if (method === 'POST') {
        const yearId = form.get('yearId');
        if (!yearId) return { error: 'Year ID is required' };
        const data = {
          semesterNumber: Number(form.get('semesterNumber') ?? 1),
          name: String(form.get('name') ?? ''),
          description: form.get('description')
            ? String(form.get('description'))
            : undefined,
          yearId: parseInt(String(yearId)),
        };
        const created = await services.semester.createSemester(data);

        if (!created) {
          return { error: 'Failed to create semester' };
        }

        return { success: true, semester: created };
      }

      // UPDATE SEMESTER
      if (method === 'PUT') {
        const id = form.get('id');
        if (!id) return { error: 'Semester ID is required' };
        const data = {
          semesterNumber: form.get('semesterNumber')
            ? Number(form.get('semesterNumber'))
            : undefined,
          name: form.get('name') ? String(form.get('name')) : undefined,
          description: form.get('description')
            ? String(form.get('description'))
            : undefined,
        };
        const updated = await services.semester.updateSemester(
          String(id),
          data
        );
        if (!updated) {
          return { error: 'Failed to update semester' };
        }
        return { success: true, semester: updated };
      }

      // DELETE SEMESTER
      if (method === 'DELETE') {
        const id = form.get('id');
        if (!id) return { error: 'Semester ID is required' };
        const deleted = await services.semester.deleteSemester(String(id));
        if (!deleted) {
          return { error: 'Failed to delete semester' };
        }
        return { success: true, id };
      }
    }

    // ========== SEMESTER-SUBJECT OPERATIONS ==========
    if (entity === 'semester-subject') {
      // ASSIGN SUBJECTS TO SEMESTER
      if (method === 'POST') {
        const semesterId = form.get('semesterId');
        const subjectIds = form.getAll('subjectIds').map((id) => Number(id));

        if (!semesterId) return { error: 'Semester ID is required' };
        if (subjectIds.length === 0)
          return { error: 'At least one subject is required' };

        const success = await services.semesterSubject.replaceSemesterSubjects(
          Number(semesterId),
          subjectIds
        );

        if (!success) {
          return { error: 'Failed to assign subjects to semester' };
        }
        return { success: true, semesterId: Number(semesterId) };
      }

      // REMOVE SUBJECT FROM SEMESTER
      if (method === 'DELETE') {
        const semesterId = form.get('semesterId');
        const subjectId = form.get('subjectId');

        if (!semesterId || !subjectId) {
          return { error: 'Semester ID and Subject ID are required' };
        }

        const success =
          await services.semesterSubject.removeSubjectFromSemester(
            Number(semesterId),
            Number(subjectId)
          );

        if (!success) {
          return { error: 'Failed to remove subject from semester' };
        }
        return { success: true };
      }
    }

    return { error: 'Unknown method or entity' };
  } catch (err: any) {
    console.error('action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

// --- Course Page Details Component ---
export default function CoursePageDetails() {
  const {
    course,
    years: initialYears,
    subjects: allSubjects,
  } = useLoaderData<{
    course: any;
    years: any[];
    subjects: any[];
  }>();

  const fetcher = useFetcher();
  const listMethod = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const lastEntity = useRef<string | null>(null);
  const [years, setYears] = useState(initialYears);
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [isEditYearModalOpen, setIsEditYearModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<any>(null);

  // Track the submission method and entity
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      const entity = fetcher.formData.get('_entity') as string | null;
      // Track method and entity for both year and semester operations
      lastMethod.current = method ?? fetcher.formMethod;
      lastEntity.current = entity;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // Show toast on completion
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;

      const formData = fetcher.formData as FormData | undefined;
      const entity = formData
        ? (formData.get('_entity') as string | null)
        : null;

      // Handle errors
      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        listMethod.load(window.location.pathname);
        return;
      }

      // Handle success
      if (data.success) {
        // Handle SEMESTER operations by refetching data
        if (entity === 'semester' || entity === 'semester-subject') {
          if (entity === 'semester') {
            toast.success(
              lastMethod.current === 'POST'
                ? 'Semester added successfully!'
                : lastMethod.current === 'PUT'
                ? 'Semester updated successfully!'
                : 'Semester deleted successfully!'
            );
          } else {
            toast.success('Subjects assigned successfully!');
          }
          // Refetch data to ensure consistency
          listMethod.load(window.location.pathname);
          lastMethod.current = null;
          return;
        }

        // Handle YEAR operations
        switch (lastMethod.current) {
          case 'POST':
            toast.success('Year added successfully!');
            // Optimistically update UI
            if (data.year) {
              setYears((prev) => [...prev, { ...data.year, semesters: [] }]);
            }
            listMethod.load(window.location.pathname);
            break;
          case 'PUT':
            toast.success('Year updated successfully!');
            if (data.year) {
              setYears((prev) =>
                prev.map((y) =>
                  y.id === data.year.id
                    ? { ...data.year, semesters: y.semesters }
                    : y
                )
              );
            }
            listMethod.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.error('Year deleted successfully!');
            setYears((prev) => prev.filter((y) => y.id !== data.id));
            listMethod.load(window.location.pathname);
            break;
          default:
            toast.success('Action completed successfully.');
            listMethod.load(window.location.pathname);
        }

        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data, fetcher.formData]);

  // Sync years when listMethod loads fresh data
  useEffect(() => {
    if (listMethod.state === 'idle' && listMethod.data?.years) {
      setYears(listMethod.data.years);
    }
  }, [listMethod.state, listMethod.data]);

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

      {Array.isArray(years) && years.length > 0 ? (
        years
          .filter(Boolean) // filter out any undefined/null values
          .map((year) => (
            <YearCard
              key={year.id}
              year={year?.yearNumber ?? 0}
              yearId={year?.id}
              yearName={year?.name ?? `Year ${year?.yearNumber ?? ''}`}
              yearData={year}
              semesters={year?.semesters || []}
              fetcher={fetcher}
              onEdit={handleOpenEditModal}
              allSubjects={allSubjects}
            />
          ))
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No years found. Add a year to get started.
          </p>
        </div>
      )}

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
