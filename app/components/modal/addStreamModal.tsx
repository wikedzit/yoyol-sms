import { useState, useEffect } from 'react';
import { X, Layers, Sparkles, Check } from 'lucide-react';
import type { FetcherWithComponents } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import type { LevelType } from '~/type/shools';

type StreamColor = 'science' | 'arts' | 'business';

interface StreamData {
  id?: number | string;
  name?: string;
  color?: StreamColor;
}

interface AddStreamModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  levelType: LevelType;
  stream?: StreamData;
}

const STREAM_CATEGORIES: Array<{
  id: StreamColor;
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
}> = [
  {
    id: 'science',
    label: 'Science',
    description: 'STEM & Natural Sciences focus',
    colorClass: 'border-blue-500/50 text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-500/10 hover:bg-blue-500/20',
  },
  {
    id: 'arts',
    label: 'Arts & Humanities',
    description: 'Languages, History, & Social Studies',
    colorClass: 'border-purple-500/50 text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20',
  },
  {
    id: 'business',
    label: 'Business & Commerce',
    description: 'Accounting, Economics, & Management',
    colorClass: 'border-amber-500/50 text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500/10 hover:bg-amber-500/20',
  },
];

export function AddStreamModal({
  open,
  setOpen,
  fetcher,
  levelType,
  stream,
}: AddStreamModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    color: StreamColor;
  }>({
    name: '',
    color: 'science',
  });

  const isEditing = Boolean(stream?.id);
  const isSubmitting = fetcher.state === 'submitting';

  // Synchronize form state on modal open or stream edit change
  useEffect(() => {
    if (open) {
      if (stream) {
        setFormData({
          name: stream.name || '',
          color: stream.color || 'science',
        });
      } else {
        setFormData({
          name: '',
          color: 'science',
        });
      }
    }
  }, [open, stream]);

  // Handle modal close on successful form submission
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      setOpen(false);
      setFormData({ name: '', color: 'science' });
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      name: e.target.value,
    }));
  };

  const handleColorChange = (value: StreamColor) => {
    setFormData((prev) => ({
      ...prev,
      color: value,
    }));
  };

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
        <fetcher.Form method="post" className="flex flex-col h-full justify-between">
          {/* HIDDEN FORM INTENT FIELDS */}
          <input
            type="hidden"
            name="_method"
            value={isEditing ? 'PUT' : 'POST'}
          />
          <input
            type="hidden"
            name="action"
            value={isEditing ? 'update_stream' : 'create_stream'}
          />
          {isEditing && (
            <input type="hidden" name="id" value={String(stream?.id)} />
          )}
          <input type="hidden" name="levelType" value={levelType} />
          <input type="hidden" name="color" value={formData.color} />

          {/* MAIN FORM CONTENT */}
          <div className="flex flex-col h-full overflow-hidden">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6 md:mb-8 shrink-0">
              <SheetHeader className="p-0">
                <SheetTitle className="text-xl md:text-2xl font-semibold flex items-center gap-2 text-foreground">
                  <Layers className="h-5 w-5 text-primary" />
                  {isEditing ? 'Edit Stream' : 'Add New Stream'}
                </SheetTitle>
              </SheetHeader>

              <SheetClose asChild className="cursor-pointer">
                <X
                  size={24}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                />
              </SheetClose>
            </div>

            <p className="text-sm text-muted-foreground mb-6 md:mb-8 shrink-0">
              {isEditing
                ? 'Update the stream configurations and category profile.'
                : 'Define a new academic stream category for this educational level.'}
            </p>

            {/* SCROLLABLE FORM BODY */}
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
              {/* LEVEL INFORMATION BADGE */}
              <div className="p-3.5 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Target Educational Level</span>
                <Badge variant="outline" className="text-xs font-semibold uppercase">
                  {levelType === 'o-level' ? 'O-Level' : 'A-Level'}
                </Badge>
              </div>

              {/* STREAM NAME INPUT */}
              <div>
                <Label htmlFor="streamName" className="block text-sm font-medium text-foreground mb-1">
                  Stream Name *
                </Label>
                <Input
                  id="streamName"
                  name="name"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g., Science A, Arts Stream, PCB Commercial..."
                  value={formData.name}
                  onChange={handleNameChange}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Specify a unique identifier or title for the stream.
                </p>
              </div>

              {/* STREAM CATEGORY SELECTOR */}
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-foreground">
                  Stream Category & Color Tag
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {STREAM_CATEGORIES.map((cat) => {
                    const isSelected = formData.color === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleColorChange(cat.id)}
                        className={`
                          flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer
                          ${cat.bgClass}
                          ${
                            isSelected
                              ? `${cat.colorClass} border-2 font-medium shadow-sm`
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }
                        `}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{cat.label}</span>
                          <span className="text-[11px] opacity-80">{cat.description}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIVE PREVIEW CARD */}
              {formData.name.trim() && (
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Visual Preview
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                        formData.color === 'science'
                          ? 'bg-blue-600'
                          : formData.color === 'arts'
                          ? 'bg-purple-600'
                          : 'bg-amber-600'
                      }`}
                    >
                      {formData.name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {formData.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {formData.color} Category • {levelType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STICKY FOOTER ACTIONS */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 shrink-0 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {isSubmitting
                ? isEditing
                  ? 'Saving...'
                  : 'Adding...'
                : isEditing
                ? 'Save Changes'
                : 'Add Stream'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}