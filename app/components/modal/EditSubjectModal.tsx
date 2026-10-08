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
} from '~/components/ui/select';
import type { FetcherWithComponents } from 'react-router';

interface Stream {
  id: string | number;
  name: string;
  levelId?: string | number;
  levelType?: string;
}

interface Level {
  id: string | number;
  name: string;
}

interface Subject {
  id: string | number;
  subjectName?: string;
  code?: string;
  levelId?: string | number;
  streamId?: string | number;
  description?: string;
}

interface EditSubjectModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  subject?: Subject | null;
  streams?: Stream[];
  levels?: Level[];
  id?: string;
}

export default function EditSubjectModal({
  open,
  setOpen,
  fetcher,
  subject,
  streams,
  levels,
}: EditSubjectModalProps) {
  const [formData, setFormData] = useState({
    subjectName: '',
    code: '',
    levelId: '',
    streamId: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form data when modal opens
  useEffect(() => {
    if (subject) {
      setFormData({
        subjectName: subject.subjectName || '',
        code: subject.code || '',
        levelId: subject.levelId ? String(subject.levelId) : '',
        streamId: subject.streamId ? String(subject.streamId) : '',
        description: subject.description || '',
      });
    }
  }, [subject, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  // Close modal on successful update or capture error response
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setError(null);
    }
    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, setOpen]);

  if (!subject) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full 
          sm:max-w-[420px] 
          md:max-w-[500px] 
          lg:!max-w-[573px] lg:!w-[573px]
          p-6 md:p-10 flex flex-col justify-between
          bg-card text-card-foreground border-border
        "
      >
        <fetcher.Form
          method="post"
          action="/subjects"
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="_entity" value="subject" />
          <input type="hidden" name="id" value={subject.id} />
          <input type="hidden" name="levelId" value={formData.levelId} />
          <input type="hidden" name="streamId" value={formData.streamId} />

          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Edit Subject
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            Update the information for this subject below.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Level
              </label>
              <Select
                value={formData.levelId || undefined}
                onValueChange={(value) => {
                  setFormData({ ...formData, levelId: value, streamId: '' });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {(levels ?? []).map((level) => (
                    <SelectItem key={level.id} value={String(level.id)}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Stream
              </label>
              <Select
                value={formData.streamId || 'none'}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    streamId: value === 'none' ? '' : value,
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No stream</SelectItem>
                  {(streams ?? [])
                    .filter((stream) => String(stream.levelId ?? '') === formData.levelId)
                    .map((stream) => (
                      <SelectItem key={stream.id} value={String(stream.id)}>
                        {stream.name} {stream.levelType ? `(${stream.levelType})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {[
              { label: 'Subject Name', field: 'subjectName', type: 'text' },
              { label: 'Code', field: 'code', type: 'text' },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {label}
                </label>
                <Input
                  type={type}
                  name={field}
                  value={(formData as any)[field]}
                  placeholder={`Enter ${label}`}
                  onChange={handleChange}
                  required
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter subject description"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === 'submitting'
                ? 'Updating...'
                : 'Update Subject'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}