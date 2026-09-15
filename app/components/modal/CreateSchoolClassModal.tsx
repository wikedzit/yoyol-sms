import { X } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { toTitleCase } from '~/utils/strings';
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
import { useState, useEffect, useMemo } from 'react';
import type { LevelType } from '~/type/shools';
import { LEVEL_CONFIG } from '~/config/academic-levels';

interface Stream {
  id: number;
  name: string;
  levelId: number;
  levelType: string;
  color: 'science' | 'arts' | 'business';
}

interface Level {
  id: number;
  name: string;
  type: string;
  description?: string;
}

interface CreateSchoolClassModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: any;
  streams: Stream[];
  levels: Level[];
}

export default function CreateSchoolClassModal({
  open,
  setOpen,
  fetcher,
  streams,
  levels,
}: CreateSchoolClassModalProps) {
  const [name, setName] = useState('');
  const [selectedLevelType, setSelectedLevelType] = useState<LevelType | ''>(
    ''
  );
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [selectedFormNumber, setSelectedFormNumber] = useState<string>('');
  const [studentCount, setStudentCount] = useState(0);

  // Filter streams based on selected level
  const filteredStreams = useMemo(() => {
    if (!selectedLevelType) return [];
    return streams.filter((s) => s.levelType === selectedLevelType);
  }, [streams, selectedLevelType]);

  // Get forms for selected level
  const availableForms = useMemo(() => {
    if (!selectedLevelType) return [];
    return LEVEL_CONFIG[selectedLevelType].forms;
  }, [selectedLevelType]);

  // Get the selected stream and level objects
  const selectedStream = streams.find((s) => s.id === Number(selectedStreamId));
  const selectedLevel = levels.find((l) => l.type === selectedLevelType);

  // Close modal on successful create
  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      setOpen(false);
      resetForm();
    }
    if (fetcher.data?.error) {
      console.error('Error creating class:', fetcher.data.error);
    }
  }, [fetcher.data, fetcher.state, setOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  // Reset stream and form when level changes
  useEffect(() => {
    setSelectedStreamId('');
    setSelectedFormNumber('');
  }, [selectedLevelType]);

  const resetForm = () => {
    setName('');
    setSelectedLevelType('');
    setSelectedStreamId('');
    setSelectedFormNumber('');
    setStudentCount(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStream || !selectedLevel || !selectedFormNumber) {
      return;
    }

    const submitData = new FormData();
    submitData.append('_method', 'POST');
    submitData.append('name', name);
    submitData.append('streamId', selectedStreamId);
    submitData.append('levelId', String(selectedLevel.id));
    submitData.append('formNumber', selectedFormNumber);
    submitData.append('studentCount', String(studentCount));

    fetcher.submit(submitData, { method: 'post' });
  };

  // Generate suggested class name based on form number
  const suggestedName = selectedFormNumber ? `${selectedFormNumber}A` : '';

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
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Add New Class
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X
                size={24}
                className="text-muted-foreground hover:text-foreground transition-colors"
              />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            Fill in the details below to register a new class.
          </p>

          {/* FORM INPUTS */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1 md:pr-2">
            {/* Level Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Academic Level <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedLevelType}
                onValueChange={(value) =>
                  setSelectedLevelType(value as LevelType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="o-level">O-Level (Form 1-4)</SelectItem>
                  <SelectItem value="a-level">A-Level (Form 5-6)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stream Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Stream <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedStreamId}
                onValueChange={setSelectedStreamId}
                disabled={!selectedLevelType || filteredStreams.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedLevelType
                        ? 'Select a level first'
                        : filteredStreams.length === 0
                        ? 'No streams available'
                        : 'Select a stream'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredStreams.map((stream) => (
                    <SelectItem key={stream.id} value={String(stream.id)}>
                      {stream.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Form Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Form <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedFormNumber}
                onValueChange={setSelectedFormNumber}
                disabled={!selectedStreamId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedStreamId
                        ? 'Select a stream first'
                        : 'Select a form'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableForms.map((form) => (
                    <SelectItem key={form.number} value={String(form.number)}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Class Name <span className="text-destructive">*</span>
              </label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(toTitleCase(e.target.value))}
                placeholder={suggestedName || 'e.g., 1A, 1B, 2C'}
                required
              />
            </div>

            {/* Student Count */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Initial Student Count
              </label>
              <Input
                name="studentCount"
                type="number"
                min={0}
                value={studentCount}
                onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* FOOTER */}
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
              disabled={
                fetcher.state === 'submitting' ||
                !name.trim() ||
                !selectedLevelType ||
                !selectedStreamId ||
                !selectedFormNumber
              }
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? 'Creating...' : 'Create Class'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}