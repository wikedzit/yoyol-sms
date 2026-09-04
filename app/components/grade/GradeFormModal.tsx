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
import { Textarea } from '~/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';
import type { GradeWithRelations } from 'workers/services/grades';
import type { FetcherWithComponents } from 'react-router';

interface GradeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: GradeWithRelations | null;
  students: Array<{ id: number; firstName: string; lastName: string }>;
  subjects: Array<{ id: number; subjectName: string }>;
  streams: Array<{ id: number; name: string; levelType: string }>;
  forms: Array<{ id: number; name: string; number: number; streamId: number }>;
  teachers: Array<{ id: number; firstName: string; lastName: string }>;
  fetcher: FetcherWithComponents<any>;
}

export function GradeForm({
  open,
  onOpenChange,
  editData,
  students = [],
  subjects = [],
  streams = [],
  forms = [],
  teachers = [],
  fetcher,
}: GradeFormProps) {
  const [studentId, setStudentId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [streamId, setStreamId] = useState<string>('');
  const [formId, setFormId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [score, setScore] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  useEffect(() => {
    if (open) {
      if (editData) {
        setStudentId(String(editData.studentId));
        setSubjectId(String(editData.subjectId));
        setStreamId(String(editData.streamId));
        setFormId(String(editData.formId));
        setTeacherId(editData.teacherId ? String(editData.teacherId) : '');
        setScore(String(editData.score));
        setRemarks(editData.remarks || '');
      } else {
        setStudentId('');
        setSubjectId('');
        setStreamId('');
        setFormId('');
        setTeacherId('');
        setScore('');
        setRemarks('');
      }
    }
  }, [open, editData]);

  // Reset form and close sheet on successful action execution
  useEffect(() => {
    if (fetcher.data?.success) {
      onOpenChange(false);
      setStudentId('');
      setSubjectId('');
      setStreamId('');
      setFormId('');
      setTeacherId('');
      setScore('');
      setRemarks('');
    }
  }, [fetcher.data, onOpenChange]);

  const getGradeFromScore = (scoreVal: number) => {
    if (scoreVal >= 90) return 'A';
    if (scoreVal >= 80) return 'B';
    if (scoreVal >= 70) return 'C';
    if (scoreVal >= 60) return 'D';
    return 'F';
  };

  // Filter forms by chosen stream ID
  const filteredForms = streamId
    ? forms.filter((f) => f.streamId === parseInt(streamId, 10))
    : forms;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
          {editData && (
            <>
              <input type="hidden" name="_method" value="PUT" />
              <input type="hidden" name="id" value={editData.id} />
            </>
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <SheetHeader className="p-0">
              <SheetTitle className="text-xl md:text-2xl font-semibold text-foreground">
                {editData ? 'Edit Grade' : 'Add New Grade'}
              </SheetTitle>
            </SheetHeader>
            <SheetClose asChild className="cursor-pointer">
              <X size={24} className="text-muted-foreground hover:text-foreground" />
            </SheetClose>
          </div>

          <p className="text-sm text-muted-foreground mb-6 md:mb-8">
            {editData
              ? 'Update the grade information below.'
              : "Enter the student's grade details below."}
          </p>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4">
            {/* Student Select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Student *
              </label>
              <Select value={studentId} onValueChange={setStudentId} required>
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

            {/* Subject Select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Subject *
              </label>
              <Select value={subjectId} onValueChange={setSubjectId} required>
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

            {/* Stream & Form Class Selects */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Stream *
                </label>
                <Select
                  value={streamId}
                  onValueChange={(value) => {
                    setStreamId(value);
                    setFormId('');
                  }}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select stream" />
                  </SelectTrigger>
                  <SelectContent>
                    {streams.map((stream) => (
                      <SelectItem key={stream.id} value={String(stream.id)}>
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="streamId" value={streamId} />
              </div>

              <div className="w-full sm:w-1/2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Form *
                </label>
                <Select
                  value={formId}
                  onValueChange={setFormId}
                  required
                  disabled={!streamId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        streamId ? 'Select form' : 'Select stream first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredForms.map((form) => (
                      <SelectItem key={form.id} value={String(form.id)}>
                        {form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="formId" value={formId} />
              </div>
            </div>

            {/* Teacher Select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Teacher
              </label>
              <Select value={teacherId} onValueChange={setTeacherId}>
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

            {/* Score Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Score *
              </label>
              <Input
                name="score"
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Enter score (0-100)"
                required
              />
              {score && (
                <p className="text-sm text-muted-foreground mt-1">
                  Calculated Grade: {getGradeFromScore(Number(score))}
                </p>
              )}
            </div>

            {/* Remarks Textarea */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Remarks
              </label>
              <Textarea
                name="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Enter any additional remarks..."
                className="w-full"
              />
            </div>
          </div>

          {/* Sticky Footer - Theme Adaptive */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-border pt-4 mt-4 bg-card sticky bottom-0 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={fetcher.state === 'submitting'}
              className="bg-primary-gradient text-white py-2 px-6 md:px-8 rounded-[8px] w-full sm:w-auto hover:scale-105 transition cursor-pointer"
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