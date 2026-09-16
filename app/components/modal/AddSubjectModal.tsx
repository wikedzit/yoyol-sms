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

export default function AddSubjectModal({
  open,
  setOpen,
  fetcher,
  streams,
  id,
}: any) {
  const [formData, setFormData] = useState({
    subjectName: '',
    code: '',
    stream: '',
    instructor: '',
    enrolledStudents: 0,
    status: 'Active',
    streamId: id || '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  useEffect(() => {
    if (open && id && streams) {
      const selectedStream = streams.find(
        (s: any) => String(s.id) === String(id)
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
        streamId: id || '',
      });
    }
    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data, id]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full               /* Mobile full-screen */
          sm:max-w-[90%]                  /* Tablet */
          md:max-w-[573px] md:w-[573px]   /* Desktop fixed width */
          p-6 md:p-10
          flex flex-col
        "
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

          {/* HEADER */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold">
                Add New Subject
              </SheetTitle>
            </SheetHeader>

            <SheetClose asChild className="cursor-pointer">
              <X size={25} />
            </SheetClose>
          </div>

          <p className="text-sm text-[#898989] mb-6 md:mb-8">
            Fill in the details below to add a new subject.
          </p>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* STREAM SELECT */}
          <div className="mb-4 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stream
            </label>

            <Select
              value={formData.streamId}
              onValueChange={(value) => {
                const selectedStream = streams?.find(
                  (s: any) => String(s.id) === String(value)
                );
                setFormData({
                  ...formData,
                  streamId: value,
                  stream: selectedStream?.name || '',
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select stream" />
              </SelectTrigger>

              <SelectContent>
                {!streams || streams.length === 0 ? (
                  <SelectItem value="no-stream" disabled>
                    No streams available
                  </SelectItem>
                ) : (
                  streams.map((stream: any) => (
                    <SelectItem key={stream.id} value={String(stream.id)}>
                      {stream.name} ({stream.levelType})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* SCROLLABLE CONTENT */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

            {/* STATUS */}
            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>

              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 border-t pt-4 mt-6 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer"
            >
              {fetcher.state === 'submitting' ? 'Adding...' : 'Add Subject'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
