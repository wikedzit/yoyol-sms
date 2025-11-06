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

export default function EditSubjectModal({
  open,
  setOpen,
  fetcher,
  subject,
  id,
}: any) {
  const [formData, setFormData] = useState({
    subjectName: '',
    code: '',
    departments: '',
    instructor: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  // 🧩 Pre-fill form data when modal opens
  useEffect(() => {
    if (subject) {
      setFormData({
        subjectName: subject.subjectName || '',
        code: subject.code || '',
        departments: subject.departments || '',
        instructor: subject.instructor || '',
        description: subject.description || '',
      });
    }
  }, [subject, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) setError(null);
  };

  // ✅ Close modal on successful update
  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
      setError(null);
    }
    // ✅ Handle error from server
    if (fetcher.data?.error) {
      setError(fetcher.data.error);
    }
  }, [fetcher.data]);

  if (!subject) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form 
          method="post" 
          action={id ? `/departments/${id}` : '/subjects'}
          className="flex flex-col h-full"
        >
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="_entity" value="subject" />
          <input type="hidden" name="id" value={subject.id} />

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-2xl font-semibold">
                Edit Subject
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={25} />
            </SheetClose>
          </div>

          <p className="text-sm text-[#898989] mb-8">
            Update the information for this subject below.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-2">
            {[
              { label: 'Subject Name', field: 'subjectName', type: 'text' },
              { label: 'Code', field: 'code', type: 'text' },
              { label: 'Department', field: 'departments', type: 'text' },
              { label: 'Instructor', field: 'instructor', type: 'text' },
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter subject description"
                className="w-full border rounded-md p-2"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex justify-end gap-3 border-t pt-4 mt-6 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="py-2 px-16 rounded-[8px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
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
