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
  years: Array<{ id: number; name: string }>;
  semesters: Array<{ id: number; name: string; yearId: number }>;
  teachers: Array<{ id: number; firstName: string; lastName: string }>;
  fetcher: FetcherWithComponents<any>;
}

export function GradeForm({
  open,
  onOpenChange,
  editData,
  students,
  subjects,
  years,
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
  const [yearId, setYearId] = useState<string>('');
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

  useEffect(() => {
    if (open) {
      if (editData) {
        setStudentId(String(editData.studentId));
        setSubjectId(String(editData.subjectId));
        setSemesterId(String(editData.semesterId));
        setTeacherId(editData.teacherId ? String(editData.teacherId) : '');
        setScore(String(editData.score));
        setRemarks(editData.remarks || '');
        const semester = semesters.find((s) => s.id === editData.semesterId);
        if (semester) setYearId(String(semester.yearId));
      } else {
        setStudentId('');
        setSubjectId('');
        setYearId('');
        setSemesterId('');
        setTeacherId('');
        setScore('');
        setRemarks('');
      }
    }
  }, [open, editData, semesters]);

  useEffect(() => {
    if (fetcher.data?.success) onOpenChange(false);
  }, [fetcher.data, onOpenChange]);

  const getGradeFromScore = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const filteredSemesters = yearId
    ? semesters.filter((s) => s.yearId === parseInt(yearId))
    : semesters;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="
          w-full max-w-full
          sm:max-w-[90%]
          md:max-w-[573px] md:w-[573px]
          p-6 md:p-10
          flex flex-col
        "
      >
        <fetcher.Form method="post" className="flex flex-col h-full">
          {editData && (
            <>
              <input type="hidden" name="_method" value="PUT" />
              <input type="hidden" name="id" value={editData.id} />
            </>
          )}

          <div className="flex-1 overflow-y-auto pr-1 md:pr-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
              <SheetHeader className="p-0">
                <SheetTitle className="text-xl md:text-2xl font-semibold">
                  {editData ? 'Edit Grade' : 'Add New Grade'}
                </SheetTitle>
              </SheetHeader>
              <SheetClose asChild className="cursor-pointer mt-2 md:mt-0">
                <X size={24} />
              </SheetClose>
            </div>

            <p className="text-sm text-[#898989] mb-6 md:mb-8">
              {editData
                ? 'Update the grade information below.'
                : "Enter the student's grade details below."}
            </p>

            {/* Form Fields */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <Select
                  value={yearId}
                  onValueChange={(value) => {
                    setYearId(value);
                    setSemesterId('');
                  }}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.id} value={String(year.id)}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester *
                </label>
                <Select
                  value={semesterId}
                  onValueChange={setSemesterId}
                  required
                  disabled={!yearId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        yearId ? 'Select semester' : 'Select year first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSemesters.map((semester) => (
                      <SelectItem key={semester.id} value={String(semester.id)}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="semesterId" value={semesterId} />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                name="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Enter any additional remarks..."
                className="w-full border rounded-md p-2"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t pt-4 mt-4 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="py-2 px-10 md:px-16 rounded-[8px] w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={fetcher.state === 'submitting'}
              className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-full sm:w-auto"
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
