import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import type { GradeWithRelations } from 'workers/services/grades';
import type { FetcherWithComponents } from 'react-router';

interface GradeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: GradeWithRelations | null;
  students: Array<{ id: number; firstName: string; lastName: string }>;
  subjects: Array<{ id: number; subjectName: string }>;
  semesters: Array<{ id: number; name: string }>;
  teachers: Array<{ id: number; firstName: string; lastName: string }>;
  fetcher: FetcherWithComponents<any>;
}

export function GradeForm({
  open,
  onOpenChange,
  editData,
  students,
  subjects,
  semesters,
  teachers,
  fetcher,
}: GradeFormProps) {
  const [studentId, setStudentId] = useState<string>(
    editData ? String(editData.studentId) : ''
  );
  const [subjectId, setSubjectId] = useState<string>(
    editData ? String(editData.subjectId) : ''
  );
  const [semesterId, setSemesterId] = useState<string>(
    editData ? String(editData.semesterId) : ''
  );
  const [teacherId, setTeacherId] = useState<string>(
    editData?.teacherId ? String(editData.teacherId) : ''
  );
  const [score, setScore] = useState<string>(
    editData ? String(editData.score) : ''
  );
  const [remarks, setRemarks] = useState<string>(editData?.remarks || '');

  // Reset form when editData changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editData) {
        setStudentId(String(editData.studentId));
        setSubjectId(String(editData.subjectId));
        setSemesterId(String(editData.semesterId));
        setTeacherId(editData.teacherId ? String(editData.teacherId) : '');
        setScore(String(editData.score));
        setRemarks(editData.remarks || '');
      } else {
        // Reset form for new grade
        setStudentId('');
        setSubjectId('');
        setSemesterId('');
        setTeacherId('');
        setScore('');
        setRemarks('');
      }
    }
  }, [open, editData]);

  // Close modal on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      onOpenChange(false);
    }
  }, [fetcher.data, onOpenChange]);

  const getGradeFromScore = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[573px] !max-w-[573px] p-10 flex flex-col"
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          {editData && (
            <>
              <input type="hidden" name="_method" value="PUT" />
              <input type="hidden" name="id" value={editData.id} />
            </>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-2xl font-semibold">
                  {editData ? 'Edit Grade' : 'Add New Grade'}
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer">
                <X size={25} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-8">
              {editData
                ? 'Update the grade information below.'
                : "Enter the student's grade details below."}
            </p>

            {/* Form Fields */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student *
              </label>
              <Select
                value={studentId}
                onValueChange={setStudentId}
                required
                name="studentId"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={String(student.id)}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="studentId" value={studentId} />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <Select
                value={subjectId}
                onValueChange={setSubjectId}
                required
                name="subjectId"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="subjectId" value={subjectId} />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester *
              </label>
              <Select
                value={semesterId}
                onValueChange={setSemesterId}
                required
                name="semesterId"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((semester) => (
                    <SelectItem key={semester.id} value={String(semester.id)}>
                      {semester.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="semesterId" value={semesterId} />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher
              </label>
              <Select
                value={teacherId}
                onValueChange={setTeacherId}
                name="teacherId"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.id)}>
                      {teacher.firstName} {teacher.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teacherId && teacherId !== 'none' && (
                <input type="hidden" name="teacherId" value={teacherId} />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Score *
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter score (0-100)"
                required
                name="score"
              />
              {score && (
                <p className="text-sm text-[#898989] mt-1">
                  Calculated Grade: {getGradeFromScore(Number(score))}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <Textarea
                placeholder="Enter any additional remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                name="remarks"
                className="w-full border rounded-md p-2"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex justify-end gap-3 border-t pt-4 mt-6 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="py-2 px-16 rounded-[8px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={fetcher.state === 'submitting'}
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
            >
              {fetcher.state === 'submitting'
                ? 'Saving...'
                : editData
                ? 'Update Grade'
                : 'Add Grade'}
            </Button>
          </div>
        </fetcher.Form>
      </SheetContent>
    </Sheet>
  );
}
