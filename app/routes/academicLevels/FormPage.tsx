import { useEffect, useRef, useState } from 'react';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
  useParams,
} from 'react-router';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Plus,
  Pencil,
  GraduationCap,
  School,
} from 'lucide-react';
import { toast } from 'sonner';
import type AcademicLevelService from 'workers/services/academic-levels';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { StreamBadge } from '~/components/ui/StreamBadge';
import { PageFrame } from '~/components/ui/PageFrame';
import { useLanguage } from '~/lib/i18n';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import type { LevelType } from '~/type/shools';
import CreateClassModal from '~/components/modal/CreateClassModal';
import EditClassModal from '~/components/modal/EditClassModal';
import { getLevelConfig, isValidFormForLevel } from '~/config/academic-levels';
import { requireSchoolPermission } from '~/lib/require-school-permission';

// --- Loader: fetch form with its classes ---
export async function loader({ request, context, params }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  const streamId = Number(params.streamId);
  const formNumber = Number(params.formId); // This is actually the form number (1-6)

  if (!streamId || isNaN(streamId)) {
    throw new Response('Invalid stream ID', { status: 400 });
  }
  if (!formNumber || isNaN(formNumber) || formNumber < 1 || formNumber > 6) {
    throw new Response('Invalid form number', { status: 400 });
  }

  // Get stream details
  const stream = await services.academicLevel.getStreamById(streamId);
  if (!stream) {
    throw new Response('Stream not found', { status: 404 });
  }

  // Determine level type from stream
  const levelType = stream.levelType as LevelType;

  // Validate that the form number is valid for this level
  if (!isValidFormForLevel(levelType, formNumber)) {
    throw new Response(
      `Form ${formNumber} is not valid for ${levelType.toUpperCase()}`,
      { status: 400 }
    );
  }

  // Get level config
  const levelConfig = getLevelConfig(levelType);

  // Get form details by stream ID and form number
  let form = await services.academicLevel.getFormByStreamIdAndNumber(
    streamId,
    formNumber
  );

  // If form doesn't exist, create it automatically
  if (!form) {
    form = await services.academicLevel.createForm({
      name: `Form ${formNumber}`,
      number: formNumber,
      streamId,
      levelId: stream.levelId,
    });
    if (!form) {
      throw new Response('Failed to create form', { status: 500 });
    }
  }

  // Get level info
  const level = await services.academicLevel.getLevelById(stream.levelId);

  // Get classes for this form
  const classes = await services.academicLevel.getFormClassesByFormId(form.id);
  const schools: { id: number }[] = await context.services.school.getAll();
  const campuses: { id: number; name: string }[] = [];
  for (const ownedSchool of schools) {
    const rows = await context.services.campus.getBySchoolId(ownedSchool.id);
    for (const row of rows) {
      campuses.push({ id: row.id, name: row.name });
    }
  }

  // Calculate totals
  const totalStudents = classes.reduce(
    (sum, c) => sum + (c.studentCount || 0),
    0
  );

  return {
    stream,
    form,
    level,
    classes,
    totalStudents,
    levelType,
    levelConfig,
    campuses,
  };
}

// --- Action: handle form class CRUD operations ---
export async function action({ request, context, params }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.update');
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  const streamId = Number(params.streamId);
  const formNumber = Number(params.formId); // This is actually the form number (1-6)
  const formData = await request.formData();
  const method = (formData.get('_method') as string) || request.method;

  try {
    // Get stream and form to verify they exist
    const stream = await services.academicLevel.getStreamById(streamId);
    if (!stream) {
      return new Response(JSON.stringify({ error: 'Stream not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const form = await services.academicLevel.getFormByStreamIdAndNumber(
      streamId,
      formNumber
    );
    if (!form) {
      return new Response(JSON.stringify({ error: 'Form not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CREATE CLASS
    if (method === 'POST') {
      const name = formData.get('name') ? String(formData.get('name')) : '';
      const studentCount = formData.get('studentCount')
        ? Number(formData.get('studentCount'))
        : 0;

      if (!name) {
        return new Response(
          JSON.stringify({ error: 'Class name is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const campusIdRaw = formData.get('campusId')
        ? Number(formData.get('campusId'))
        : undefined;
      let campusId: number | undefined;
      if (campusIdRaw) {
        const selectedCampus = await context.services.campus.getById(campusIdRaw);
        if (!selectedCampus) {
          return new Response(
            JSON.stringify({ error: 'Selected campus was not found' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        campusId = selectedCampus.id;
      }

      const created = await services.academicLevel.createFormClass({
        name,
        formId: form.id,
        streamId,
        levelId: stream.levelId,
        studentCount,
        campusId,
      });

      return { success: true, formClass: created };
    }

    // UPDATE CLASS
    if (method === 'PUT') {
      const id = formData.get('id');
      const name = formData.get('name')
        ? String(formData.get('name'))
        : undefined;
      const studentCount = formData.get('studentCount')
        ? Number(formData.get('studentCount'))
        : undefined;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Class ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const updated = await services.academicLevel.updateFormClass(Number(id), {
        name,
        studentCount,
      });

      return { success: true, formClass: updated };
    }

    // DELETE CLASS
    if (method === 'DELETE') {
      const id = formData.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Class ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await services.academicLevel.deleteFormClass(Number(id));
      return { success: true, id: Number(id) };
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('FormPage action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// --- FormPage Component ---
export default function FormPage() {
  const {
    stream,
    form,
    level,
    classes: initialClasses,
    totalStudents,
    levelType,
    levelConfig,
    campuses,
  } = useLoaderData<{
    stream: {
      id: number;
      name: string;
      levelId: number;
      levelType: string;
      color: 'science' | 'arts' | 'business';
    };
    form: {
      id: number;
      name: string;
      number: number;
      streamId: number;
      levelId: number;
    };
    level: {
      id: number;
      name: string;
      type: string;
    } | null;
    classes: Array<{
      id: number;
      name: string;
      formId: number;
      streamId: number;
      levelId: number;
      studentCount: number;
    }>;
    totalStudents: number;
    levelType: LevelType;
    levelConfig: {
      name: string;
      description: string;
      basePath: string;
    };
    campuses: { id: number; name: string }[];
  }>();

  const params = useParams();
  const fetcher = useFetcher();
  const listFetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const { t } = useLanguage();
  const [classes, setClasses] = useState(initialClasses ?? []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Track last method for toast messages
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method =
        (fetcher.formData.get('_method') as string) ?? fetcher.formMethod;
      lastMethod.current = method;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // Handle toast + optimistic UI updates
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        lastMethod.current = null;
        return;
      }

      if (data.success) {
        switch (lastMethod.current) {
          case 'POST':
            toast.success('Class added successfully!');
            if (data.formClass) {
              setClasses((prev) => [...prev, data.formClass]);
            }
            listFetcher.load(window.location.pathname);
            break;
          case 'PUT':
            toast.success('Class updated successfully!');
            if (data.formClass) {
              setClasses((prev) =>
                prev.map((c) =>
                  c.id === data.formClass.id ? data.formClass : c
                )
              );
            }
            listFetcher.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.success('Class deleted successfully!');
            setClasses((prev) => prev.filter((c) => c.id !== data.id));
            break;
          default:
            toast.success('Action completed successfully.');
            listFetcher.load(window.location.pathname);
        }
        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Sync list on reload
  useEffect(() => {
    if (listFetcher.state === 'idle' && listFetcher.data) {
      setClasses(listFetcher.data.classes);
    }
  }, [listFetcher.state, listFetcher.data]);

  const handleEditClass = (classItem: any) => {
    setSelectedClass(classItem);
    setIsEditModalOpen(true);
  };

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

  const getClassColorClasses = (color: 'science' | 'arts' | 'business') => {
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

  const getClassCardBg = (color: 'science' | 'arts' | 'business') => {
    switch (color) {
      case 'science':
        return 'hover:border-blue-300 hover:bg-blue-50/50';
      case 'arts':
        return 'hover:border-purple-300 hover:bg-purple-50/50';
      case 'business':
        return 'hover:border-amber-300 hover:bg-amber-50/50';
      default:
        return 'hover:border-gray-300 hover:bg-gray-50/50';
    }
  };

  // Sort classes alphabetically
  const sortedClasses = [...classes].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Calculate current total students
  const currentTotalStudents = classes.reduce(
    (sum, c) => sum + (c.studentCount || 0),
    0
  );

  return (
    <PageFrame
      className="pb-8"
      title={form.name}
      description={`Manage and organize classes for ${stream.name}, form ${form.number}`}
      trail={[
        { label: levelConfig.name, to: levelConfig.basePath },
        { label: stream.name, to: `${levelConfig.basePath}/${params.streamId}` },
        { label: form.name },
      ]}
      actions={
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary-gradient text-white rounded-lg px-4 py-2 flex items-center gap-2 w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
        >
          <span className="text-xl">+</span>
          <span className="font-medium">Add Class</span>
        </Button>
      }
    >

      {/* EMPTY STATE */}
      {sortedClasses.length === 0 ? (
        <p className="text-center text-gray-500 mt-10">No classes yet.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('name')}</TableHead>
                <TableHead className="font-semibold">{t('form')}</TableHead>
                <TableHead className="font-semibold">{t('stream')}</TableHead>
                <TableHead className="font-semibold">{t('studentCount')}</TableHead>
                <TableHead className="font-semibold">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClasses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{form.name}</TableCell>
                  <TableCell>{stream.name}</TableCell>
                  <TableCell>{c.studentCount || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClass(c);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Pencil size={16} /> Edit
                      </Button>
                      <DeleteStudentButton
                        id={String(c.id)}
                        name={c.name}
                        fetcher={fetcher}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      <CreateClassModal
        open={isAddModalOpen}
        setOpen={setIsAddModalOpen}
        fetcher={fetcher}
        campuses={campuses}
      />

      <EditClassModal
        open={isEditModalOpen}
        setOpen={setIsEditModalOpen}
        fetcher={fetcher}
        editingClass={selectedClass}
        formNumber={form.number}
      />
    </PageFrame>
  );
}
