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

interface CreateClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  formNumber?: number;
  id?: string;
}

export default function CreateClassModal({
  open,
  setOpen,
  fetcher,
  formNumber,
  id,
}: CreateClassModalProps) {
  const [name, setName] = useState('');
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
      setName('');
      setStudentCount(0);
    }
    if (fetcher.data?.error) {
      console.error('Error creating class:', fetcher.data.error);
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName('');
      setStudentCount(0);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('_method', 'POST');
    submitData.append('name', name);
    submitData.append('studentCount', String(studentCount));
    fetcher.submit(submitData, { method: 'post' });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[480px] md:w-[480px]
          p-6 md:p-8
          flex flex-col
        "
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                Add New Class
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground transition-colors" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Create a new class for this form. Classes are typically named like{' '}
            {formNumber ? `${formNumber}A, ${formNumber}B, ${formNumber}C` : '1A, 1B, 1C'}.
          </p>

          {/* FORM INPUTS */}
          <div className="flex-1 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Class Name
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  formNumber
                    ? `e.g., ${formNumber}A, ${formNumber}B, ${formNumber}C`
                    : 'e.g., 1A, 1B, 2C'
                }
                required
                className="h-11"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter a unique name for this class
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Student Count
              </label>
              <Input
                name="studentCount"
                type="number"
                min={0}
                value={studentCount}
                onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Number of students enrolled in this class
              </p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-6 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-11 px-6 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white h-11 px-6 w-full sm:w-auto"
              disabled={fetcher.state === 'submitting' || !name.trim()}
            >
              {fetcher.state === 'submitting' ? 'Creating...' : 'Create Class'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
