import {
  type LoaderFunctionArgs,
  Link,
  useLoaderData,
  useParams,
} from 'react-router';
import { Card } from '~/components/ui/card';
import {
  Users,
  GraduationCap,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type AcademicLevelService from 'workers/services/academic-levels';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import { PageHeader } from '~/components/ui/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { useLanguage } from '~/lib/i18n';
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
import { getFormsForLevel, getLevelConfig } from '~/config/academic-levels';
import { requireSchoolPermission } from '~/lib/require-school-permission';

// --- Loader: fetch stream with class counts for each form ---
export async function loader({ context, params, request }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
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

  // Determine level type from stream
  const levelType = stream.levelType as LevelType;

  // Get level info
  const level = await services.academicLevel.getLevelById(stream.levelId);

  // Get level config to determine which forms to show
  const levelConfig = getLevelConfig(levelType);
  const staticForms = levelConfig.forms;

  // Get class and student counts for each static form
  const formsWithCounts = await Promise.all(
    staticForms.map(async (form) => {
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

  return { stream, level, forms: formsWithCounts, levelType, levelConfig };
}

// --- StreamPage Component ---
export default function StreamPage() {
  const { t } = useLanguage();
  const { stream, level, forms, levelType, levelConfig } = useLoaderData<{
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
    levelType: LevelType;
    levelConfig: {
      name: string;
      description: string;
      basePath: string;
    };
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
              <Link to={levelConfig.basePath}>{levelConfig.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{stream.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Forms List */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">{t('form')}</TableHead>
              <TableHead className="font-semibold">{t('classrooms')}</TableHead>
              <TableHead className="font-semibold">{t('studentCount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow key={form.number}>
                <TableCell className="font-medium">
                  <Link
                    className="underline"
                    to={`${levelConfig.basePath}/${params.streamId}/forms/${form.number}`}
                  >
                    {form.name}
                  </Link>
                </TableCell>
                <TableCell>{form.classCount}</TableCell>
                <TableCell>{form.studentCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
