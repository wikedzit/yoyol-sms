import { X } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useLanguage } from '~/lib/i18n';
import type { FetcherWithComponents } from 'react-router';

interface Stream {
  id: string | number;
  name: string;
  levelType?: string;
}

interface AddSubjectModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  streams: Stream[];
  id?: string | number;
}

export default function AddSubjectModal({
  open,
  setOpen,
  fetcher,
  streams = [],
  id,
}: AddSubjectModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    subjectName: '',
    code: '',
    stream: '',
    instructor: '',
    enrolledStudents: 0,
    status: 'Active',
    streamId: id ? String(id) : '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  useEffect(() => {
    if (open && id && streams.length > 0) {
      const selectedStream = streams.find(
        (s) => String(s.id) === String(id)
      );
      if (selectedStream) {
        setFormData((prev) => ({
          ...prev,
          streamId: String(id),
          stream: selectedStream.name,
        }));
      }
    }
  }, [open, id, streams]);

  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setError(null);
      setFormData({
        subjectName: '',
        code: '',
        stream: '',
        instructor: '',
        enrolledStudents: 0,
        status: 'Active',
        streamId: id ? String(id) : '',
      });
    }
    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, id, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full max-w-full sm:max-w-[90%] md:max-w-[573px] md:w-[573px] p-6 md:p-10 flex flex-col bg-card text-card-foreground border-border"
      >
        <fetcher.Form
          method="post"
          action="/subjects"
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="_entity" value="subject" />
          <input type="hidden" name="status" value={formData.status} />
          <input type="hidden" name="streamId" value={formData.streamId} />
          <input type="hidden" name="stream" value={formData.stream} />

          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Add New Subject
              </SheetTitle>
            </SheetHeader>

            <SheetClose asChild className="cursor-pointer">
              <X size={25} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            Fill in the details below to add a new subject.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="mb-4 w-full">
            <label className="block text-sm font-medium text-foreground mb-1">
              Stream
            </label>

            <Select
              value={formData.streamId}
              onValueChange={(value) => {
                const selectedStream = streams.find(
                  (s) => String(s.id) === String(value)
                );
                setFormData((prev) => ({
                  ...prev,
                  streamId: value,
                  stream: selectedStream?.name || '',
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`${t('select')} ${t('streams').toLowerCase()}`} />
              </SelectTrigger>

              <SelectContent>
                {!streams || streams.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    {t('noStreams')}
                  </div>
                ) : (
                  streams.map((stream) => (
                    <SelectItem key={stream.id} value={String(stream.id)}>
                      {stream.name} {stream.levelType ? `(${stream.levelType})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {[
              { label: 'Subject Name', field: 'subjectName', type: 'text' },
              { label: 'Code', field: 'code', type: 'text' },
              { label: 'Instructor', field: 'instructor', type: 'text' },
              {
                label: 'Enrolled Students',
                field: 'enrolledStudents',
                type: 'number',
              },
            ].map(({ label, field, type }) => (
              <div key={field} className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1">
                  {label}
                </label>

                <Input
                  type={type}
                  name={field}
                  value={(formData as Record<string, any>)[field]}
                  placeholder={`Enter ${label}`}
                  onChange={handleChange}
                  required
                />
              </div>
            ))}

            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-foreground mb-1">
                Status
              </label>

              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Active">{t('active')}</SelectItem>
                  <SelectItem value="Inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6 sticky bottom-0 bg-card z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] hover:scale-105 transition cursor-pointer"
            >
              {t('cancel')}
            </Button>

            <Button
              type="submit"
              disabled={fetcher.state === 'submitting'}
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? t('adding') : t('addSubject')}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}