import { useEffect, useRef, useState } from 'react';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Link,
  useFetcher,
  useLoaderData,
} from 'react-router';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Plus, Pencil, Users, BookOpen, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import type AcademicLevelService from 'workers/services/academic-levels';
import { LevelBadge } from '~/components/ui/LevelBadge';
import { PageHeader } from '~/components/ui/PageHeader';
import { AddStreamModal } from '~/components/modal/addStreamModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { useLanguage } from '~/lib/i18n';
import type { LevelType } from '~/type/shools';
import { LEVEL_CONFIG } from '~/config/academic-levels';

const LEVEL_TYPE: LevelType = 'a-level';
const LEVEL_INFO = LEVEL_CONFIG[LEVEL_TYPE];

// --- Loader: fetch A-Level data with streams ---
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  // Get or create A-Level
  let level = await services.academicLevel.getLevelByType(LEVEL_TYPE);

  if (!level) {
    // Create A-Level if it doesn't exist
    level = await services.academicLevel.createLevel({
      name: LEVEL_INFO.name,
      type: LEVEL_TYPE,
      description: LEVEL_INFO.description,
    });
  }

  // Get streams for this level
  const streams = level
    ? await services.academicLevel.getStreamsByLevelType(LEVEL_TYPE)
    : [];

  // Get forms count for each stream
  const streamsWithCounts = await Promise.all(
    streams.map(async (stream) => {
      const formCount = await services.academicLevel.countFormsByStreamId(
        stream.id
      );
      return {
        ...stream,
        formCount,
      };
    })
  );

  return { level, streams: streamsWithCounts };
}

// --- Action: handle stream CRUD operations ---
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as {
    academicLevel: AcademicLevelService;
  };

  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    // Get the A-Level first
    let level = await services.academicLevel.getLevelByType(LEVEL_TYPE);
    if (!level) {
      return new Response(JSON.stringify({ error: 'A-Level not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CREATE STREAM
    if (method === 'POST') {
      const name = form.get('name') ? String(form.get('name')) : '';
      const color =
        (form.get('color') as 'science' | 'arts' | 'business') || 'science';

      if (!name) {
        return new Response(
          JSON.stringify({ error: 'Stream name is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const created = await services.academicLevel.createStream({
        name,
        levelId: level.id,
        levelType: LEVEL_TYPE,
        color,
      });

      return { success: true, stream: created };
    }

    // UPDATE STREAM
    if (method === 'PUT') {
      const id = form.get('id');
      const name = form.get('name') ? String(form.get('name')) : '';
      const color = form.get('color') as
        | 'science'
        | 'arts'
        | 'business'
        | undefined;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Stream ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const updated = await services.academicLevel.updateStream(Number(id), {
        name: name || undefined,
        color,
      });

      return { success: true, stream: updated };
    }

    // DELETE STREAM
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Stream ID is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      await services.academicLevel.deleteStream(Number(id));
      return { success: true, id: Number(id) };
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('A-Level action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// --- A-Level Page Component ---
export default function ALevelPage() {
  const { t } = useLanguage();
  const { level, streams: initialStreams } = useLoaderData<{
    level: {
      id: number;
      name: string;
      type: string;
      description?: string;
    } | null;
    streams: Array<{
      id: number;
      name: string;
      levelId: number;
      levelType: string;
      color: 'science' | 'arts' | 'business';
      formCount: number;
    }>;
  }>();

  const fetcher = useFetcher();
  const listFetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);

  const [streams, setStreams] = useState(initialStreams ?? []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<any>(null);

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
            toast.success('Stream added successfully!');
            if (data.stream) {
              setStreams((prev) => [...prev, { ...data.stream, formCount: 0 }]);
            }
            listFetcher.load(window.location.pathname);
            break;
          case 'PUT':
            toast.success('Stream updated successfully!');
            if (data.stream) {
              setStreams((prev) =>
                prev.map((s) =>
                  s.id === data.stream.id
                    ? { ...data.stream, formCount: s.formCount }
                    : s
                )
              );
            }
            listFetcher.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.success('Stream deleted successfully!');
            setStreams((prev) => prev.filter((s) => s.id !== data.id));
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
      setStreams(listFetcher.data.streams);
    }
  }, [listFetcher.state, listFetcher.data]);

  const handleEditStream = (stream: any) => {
    setSelectedStream(stream);
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Header */}
      <PageHeader
        title={LEVEL_INFO.name}
        description={level?.description || LEVEL_INFO.description}
        badge={<LevelBadge level={LEVEL_TYPE} size="lg" />}
        actions={
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary-gradient text-white rounded-lg px-4 py-2 flex items-center gap-2  hover:scale-110 hover:text-white-600 transition cursor-pointer"
          >
            <Plus size={18} />
            <span className="font-medium">{t('addStream')}</span>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-a-level/10">
              <GraduationCap className="h-6 w-6 text-a-level" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('totalStreams')}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {streams.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <BookOpen className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('totalForms')}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {streams.reduce((sum, s) => sum + (s.formCount || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Streams Grid */}
      {streams.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('noStreams')}</h3>
              <p className="text-muted-foreground mt-1">
                {t('getStartedStream')} (e.g., PCM, PCB, HGL)
              </p>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary-gradient text-white mt-2  hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              <Plus size={16} className="mr-2" />
              {t('addFirstStream')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {streams.map((stream) => (
            <Card key={stream.id} className={`p-6 border-none `}>
              <Link to={`/levels/a-level/${stream.id}`} className="block">
                {/* Stream Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {stream.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen size={14} />
                    <span>{stream.formCount} forms</span>
                  </div>
                </div>
              </Link>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Link
                  to={`/levels/a-level/${stream.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('viewForms')} →
                </Link>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:scale-110 hover:text-red-600 transition cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditStream(stream);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DeleteStudentButton
                    id={String(stream.id)}
                    name={stream.name}
                    fetcher={fetcher}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Stream Modal */}
      <AddStreamModal
        open={isAddModalOpen}
        setOpen={setIsAddModalOpen}
        fetcher={fetcher}
        levelType={LEVEL_TYPE}
      />

      {/* Edit Stream Modal */}
      {isEditModalOpen && selectedStream && (
        <AddStreamModal
          open={isEditModalOpen}
          setOpen={setIsEditModalOpen}
          fetcher={fetcher}
          levelType={LEVEL_TYPE}
          stream={selectedStream}
        />
      )}
    </div>
  );
}

