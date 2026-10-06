import { useState, useEffect } from 'react';
import { X, School } from 'lucide-react';
import type { FetcherWithComponents } from 'react-router';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

interface CreateClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  forms?: Array<{ id: number; name: string }>;
  streams?: Array<{ id: number; name: string }>;
  levels?: Array<{ id: number; name: string }>;
  campuses?: Array<{ id: number; name: string }>;
}

export default function CreateClassModal({
  open,
  setOpen,
  fetcher,
  forms = [],
  streams = [],
  levels = [],
  campuses = [],
}: CreateClassModalProps) {
  const [className, setClassName] = useState('');
  const [formId, setFormId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [campusId, setCampusId] = useState('');

  const isSubmitting = fetcher.state === 'submitting';

  const resetForm = () => {
    setClassName('');
    setFormId('');
    setStreamId('');
    setLevelId('');
    setCampusId('');
  };

  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
      resetForm();
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full 
          sm:max-w-[420px] 
          md:max-w-[500px] 
          lg:!max-w-[573px] lg:!w-[573px]
          p-6 md:p-10 flex flex-col
          bg-card text-card-foreground border-border
        "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          <input type="hidden" name="_method" value="POST" />
          <input type="hidden" name="action" value="create_class" />

          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
                <School className="h-6 w-6 text-primary" />
                Create New Class
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-foreground mb-6 md:mb-8">
            Configure form, level, and stream parameters to create a new class.
          </p>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Class Name <span className="text-destructive">*</span>
              </label>
              <Input
                name="name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Form 1 Science A"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Level <span className="text-destructive">*</span>
                </label>
                <Select value={levelId} onValueChange={setLevelId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((lvl) => (
                      <SelectItem key={lvl.id} value={String(lvl.id)}>
                        {lvl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="levelId" value={levelId} required />
              </div>

              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Form <span className="text-destructive">*</span>
                </label>
                <Select value={formId} onValueChange={setFormId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="formId" value={formId} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Stream <span className="text-destructive">*</span>
              </label>
              <Select value={streamId} onValueChange={setStreamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent>
                  {streams.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="streamId" value={streamId} required />
            </div>

            {campuses.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Campus
                </label>
                <Select value={campusId || undefined} onValueChange={setCampusId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((row) => (
                      <SelectItem key={row.id} value={String(row.id)}>
                        {row.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="campusId" value={campusId} />
              </div>
            ) : null}
          </div>

          {/* Sticky Action Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !className.trim()}
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Class'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}