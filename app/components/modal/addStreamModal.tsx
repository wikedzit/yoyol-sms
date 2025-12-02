import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '~/components/ui/sheet';
import { useState, useEffect } from 'react';
import { Input } from '~/components/ui/input';
import type { LevelType } from '~/type/shools';

interface AddStreamModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  levelType: LevelType;
  stream?: {
    id?: number;
    name?: string;
    color?: 'science' | 'arts' | 'business';
  };
}

export function AddStreamModal({
  open,
  setOpen,
  fetcher,
  levelType,
  stream,
}: AddStreamModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    color: 'science' as 'science' | 'arts' | 'business',
  });

  const isEditing = !!stream?.id;

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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      name: e.target.value,
    }));
  };

  const handleColorChange = (value: 'science' | 'arts' | 'business') => {
    setFormData((prev) => ({
      ...prev,
      color: value,
    }));
  };

  // Close on success
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
      setFormData({
        name: '',
        color: 'science',
      });
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full 
          sm:max-w-[420px]
          md:max-w-[520px]
          lg:max-w-[573px]
          h-full flex flex-col p-5 sm:p-6 md:p-8
        "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          {/* Hidden fields */}
          <input
            type="hidden"
            name="_method"
            value={isEditing ? 'PUT' : 'POST'}
          />
          {isEditing && (
            <input type="hidden" name="id" value={stream?.id?.toString()} />
          )}
          <input type="hidden" name="name" value={formData.name} />
          <input type="hidden" name="color" value={formData.color} />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <SheetHeader className="p-0">
              <SheetTitle className="text-lg sm:text-xl md:text-2xl font-semibold">
                {isEditing ? 'Edit Stream' : 'Add New Stream'}
              </SheetTitle>
            </SheetHeader>

            <SheetClose asChild className="cursor-pointer">
              <X
                size={26}
                className="text-muted-foreground hover:text-foreground"
              />
            </SheetClose>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? 'Update the stream details below.'
                : 'Enter a stream name and choose a color for this level.'}
            </p>
            {/* Stream Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Stream Name
              </label>
              <Input
                type="text"
                placeholder="e.g., Science, Arts, Commerce..."
                value={formData.name}
                onChange={handleNameChange}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the name for your stream
              </p>
            </div>
            {/* Level Info */}
            <div className="p-4 rounded-lg bg-muted/40">
              <p className="text-sm text-muted-foreground">
                This stream will be added to{' '}
                <span className="font-medium text-foreground">
                  {levelType === 'o-level' ? 'O-Level' : 'A-Level'}
                </span>
              </p>
            </div>
            {/* Preview
            {formData.name && (
              <div className="p-4 rounded-lg border bg-card">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Preview
                </p>

                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                      formData.color === 'science'
                        ? 'bg-blue-500'
                        : formData.color === 'arts'
                        ? 'bg-purple-500'
                        : 'bg-amber-500'
                    }`}
                  >
                    {formData.name.charAt(0)}
                  </div>

                  <div>
                    <p className="font-semibold">{formData.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {formData.color} Stream
                    </p>
                  </div>
                </div>
              </div>
            )} */}
          </div>

          {/* Sticky Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4 bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-primary-gradient text-white w-full sm:w-auto"
              disabled={fetcher.state === 'submitting' || !formData.name}
            >
              {fetcher.state === 'submitting'
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
