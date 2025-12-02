import {
  type LoaderFunctionArgs,
  Link,
  useLoaderData,
  useParams,
} from 'react-router';
import { Card } from '~/components/ui/card';
import {
  Users,
  ChevronRight,
  GraduationCap,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type AcademicLevelService from 'workers/services/academic-levels';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import { PageHeader } from '~/components/ui/PageHeader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import type { LevelType } from '~/type/shools';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';

const LEVEL_TYPE: LevelType = 'o-level';

// Static forms for O-Level (Form 1-4)
const STATIC_FORMS = [
  { number: 1, name: 'Form 1' },
  { number: 2, name: 'Form 2' },
  { number: 3, name: 'Form 3' },
  { number: 4, name: 'Form 4' },
];

// --- Loader: fetch stream with class counts for each form ---
export async function loader({ context, params }: LoaderFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  const streamId = Number(params.streamId);
  if (!streamId || isNaN(streamId)) {
    throw new Response('Invalid stream ID', { status: 400 });
  }

  // Get stream details
  const stream = await services.academicLevel.getStreamById(streamId);
  if (!stream) {
    throw new Response('Stream not found', { status: 404 });
  }

  // Get level info
  const level = await services.academicLevel.getLevelById(stream.levelId);

  // Get class and student counts for each static form
  const formsWithCounts = await Promise.all(
    STATIC_FORMS.map(async (form) => {
      // Get classes that belong to this stream and form number
      const classCount =
        await services.academicLevel.countClassesByStreamAndFormNumber(
          streamId,
          form.number
        );
      const studentCount =
        await services.academicLevel.getTotalStudentsByStreamAndFormNumber(
          streamId,
          form.number
        );
      return {
        ...form,
        classCount,
        studentCount,
      };
    })
  );

  return { stream, level, forms: formsWithCounts };
}

// --- StreamPage Component ---
export default function StreamPage() {
  const { stream, level, forms } = useLoaderData<{
    stream: {
      id: number;
      name: string;
      levelId: number;
      levelType: string;
      color: 'science' | 'arts' | 'business';
    };
    level: {
      id: number;
      name: string;
      type: string;
    } | null;
    forms: Array<{
      number: number;
      name: string;
      classCount: number;
      studentCount: number;
    }>;
  }>();

  const params = useParams();

  const getStreamColorClasses = (color: 'science' | 'arts' | 'business') => {
    switch (color) {
      case 'science':
        return 'border-blue-200 bg-blue-50';
      case 'arts':
        return 'border-purple-200 bg-purple-50';
      case 'business':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getFormColorClasses = (color: 'science' | 'arts' | 'business') => {
    switch (color) {
      case 'science':
        return 'bg-blue-500';
      case 'arts':
        return 'bg-purple-500';
      case 'business':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getFormBorderColor = (color: 'science' | 'arts' | 'business') => {
    switch (color) {
      case 'science':
        return 'border-l-blue-500';
      case 'arts':
        return 'border-l-purple-500';
      case 'business':
        return 'border-l-amber-500';
      default:
        return 'border-l-gray-500';
    }
  };

  // Calculate totals
  const totalClasses = forms.reduce((sum, f) => sum + (f.classCount || 0), 0);
  const totalStudents = forms.reduce(
    (sum, f) => sum + (f.studentCount || 0),
    0
  );

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/levels/o-level">O-Level</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{stream.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Forms List */}
      <div className="space-y-3">
        {forms.map((form) => {
          const formClasses = form.classCount;
          const totalStudents = form.studentCount;

          return (
            <Link
              key={form.number}
              to={`/levels/o-level/${params.streamId}/forms/${form.number}`}
              className="group bg-card rounded-xl p-5 border border-border 
          hover:border-primary/30 shadow-card hover:shadow-card-hover 
          transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{form.name}</h3>

                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{formClasses} classes</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {totalStudents} students
                    </span>
                  </div>
                </div>
              </div>

              {/* Chevron */}
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          );
        })}

        {forms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No forms available</p>
            <p className="text-sm">
              Create forms in this stream to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
