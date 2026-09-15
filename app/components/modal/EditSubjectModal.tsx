
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FetcherWithComponents } from 'react-router';

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

interface Stream {
  id: string | number;
  name: string;
  levelType?: string;
}

interface Subject {
  id: string | number;
  subjectName?: string;
  code?: string;
  stream?: string;
  streamId?: string | number;
  instructor?: string;
  teacherId?: string | number;
  description?: string;
}

interface Teacher {
  id: string | number;
  firstName: string;
  lastName: string;
}

interface EditSubjectModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetcher: FetcherWithComponents<any>;
  subject?: Subject | null;
  streams?: Stream[];
  teachers?: Teacher[];
}

export default function EditSubjectModal({
  open,
  setOpen,
  fetcher,
  subject,
  streams,
  teachers = [],
}: EditSubjectModalProps) {
  const [formData, setFormData] = useState({
    subjectName: '',
    code: '',
    stream: '',
    streamId: '',
    instructor: '',
    teacherId: '',
    description: '',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subject) {
      setFormData({
        subjectName: subject.subjectName || '',
        code: subject.code || '',
        stream: subject.stream || '',
        streamId: subject.streamId
          ? String(subject.streamId)
          : '',
        instructor: subject.instructor || '',
        teacherId: subject.teacherId
          ? String(subject.teacherId)
          : '',
        description: subject.description || '',
      });

      setError(null);
    }
  }, [subject, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const formatted = ['subjectName', 'instructor'].includes(name) ? toTitleCase(value) : value;
    setFormData({ ...formData, [name]: formatted });
    if (error) setError(null);
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    if (error) {
      setError(null);
    }
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setError(null);
    }

    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, setOpen]);

  if (!subject) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[420px]
          md:max-w-[500px]
          lg:!max-w-[573px]
          lg:!w-[573px]
          p-6 md:p-10
          flex flex-col
          justify-between
          bg-card
          text-card-foreground
          border-border
        "
      >
        <fetcher.Form
          method="post"
          action="/subjects"
          className="flex flex-col h-full"
        >
          <input
            type="hidden"
            name="_method"
            value="PUT"
          />

          <input
            type="hidden"
            name="_entity"
            value="subject"
          />

          <input
            type="hidden"
            name="id"
            value={subject.id}
          />

          <input
            type="hidden"
            name="streamId"
            value={formData.streamId}
          />

          <input
            type="hidden"
            name="stream"
            value={formData.stream}
          />

          <input
            type="hidden"
            name="teacherId"
            value={formData.teacherId}
          />

          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                Edit Subject
              </SheetTitle>
            </SheetHeader>

            <SheetClose asChild className="cursor-pointer">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={24} />
              </button>
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            Update the information for this subject below.
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">

            {/* Stream */}
            {streams && streams.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Stream
                </label>

                <Select
                  value={formData.streamId}
                  onValueChange={(value) => {
                    const selectedStream = streams.find(
                      (stream) =>
                        String(stream.id) === String(value)
                    );

                    setFormData((prev) => ({
                      ...prev,
                      streamId: value,
                      stream: selectedStream?.name || '',
                    }));

                    if (error) {
                      setError(null);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>

                  <SelectContent>
                    {streams.map((stream) => (
                      <SelectItem
                        key={stream.id}
                        value={String(stream.id)}
                      >
                        {stream.name}
                        {stream.levelType
                          ? ` (${stream.levelType})`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Teacher
              </label>

              <Select
                value={formData.teacherId}
                onValueChange={(value) => {
                  const selectedTeacher = teachers.find(
                    (teacher) =>
                      String(teacher.id) === String(value)
                  );

                  setFormData((prev) => ({
                    ...prev,
                    teacherId: value,
                    instructor: selectedTeacher
                      ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
                      : '',
                  }));

                  if (error) {
                    setError(null);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>

                <SelectContent>
                  {teachers.length > 0 ? (
                    teachers.map((teacher) => (
                      <SelectItem
                        key={teacher.id}
                        value={String(teacher.id)}
                      >
                        {teacher.firstName}{' '}
                        {teacher.lastName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem
                      value="no-teachers"
                      disabled
                    >
                      No teachers available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <input
                type="hidden"
                name="instructor"
                value={formData.instructor}
              />
            </div>

            {/* Subject Name and Code */}
            {[
              {
                label: 'Subject Name',
                field: 'subjectName',
                type: 'text',
              },
              {
                label: 'Code',
                field: 'code',
                type: 'text',
              },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {label}
                </label>

                <Input
                  type={type}
                  name={field}
                  value={
                    formData[
                      field as keyof typeof formData
                    ]
                  }
                  placeholder={`Enter ${label}`}
                  onChange={handleChange}
                  required
                />
              </div>
            ))}

            {/* Description */}
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
                className="
                  w-full
                  rounded-md
                  border
                  border-input
                  bg-background
                  px-3
                  py-2
                  text-sm
                  text-foreground
                  shadow-sm
                  placeholder:text-muted-foreground
                  focus-visible:outline-none
                  focus-visible:ring-1
                  focus-visible:ring-ring
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="
              flex
              flex-col
              sm:flex-row
              justify-end
              gap-3
              border-t
              border-border
              pt-4
              mt-4
              bg-card
              sticky
              bottom-0
              z-10
            "
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="
                py-2
                px-10
                md:px-16
                rounded-[8px]
                w-full
                sm:w-auto
                hover:scale-105
                transition
                cursor-pointer
              "
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={fetcher.state === 'submitting'}
              className="
                bg-primary-gradient
                text-white
                py-2
                px-6
                md:px-8
                rounded-[8px]
                w-full
                sm:w-auto
                hover:scale-105
                transition
                cursor-pointer
              "
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

