import { useState, useEffect, useRef } from 'react';
import { useLoaderData, useFetcher } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Plus, Download, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { GradeBadge } from '~/components/grade/GradeBadge';
import { GradeForm } from '~/components/grade/GradeFormModal';
import type GradeService from 'workers/services/grades';
import type { GradeWithRelations } from 'workers/services/grades';
import type SubjectService from 'workers/services/subjects';
import type StudentService from 'workers/services/student';
import type TeacherService from 'workers/services/teachers';
import type AcademicLevelService from 'workers/services/academic-levels';
import { DeleteButton } from '~/components/DeleteButton';

// Loader: fetch grades and all related data
export async function loader({ context, request }: LoaderFunctionArgs) {
  const services = context.services as {
    grade: GradeService;
    subject: SubjectService;
    student: StudentService;
    teacher: TeacherService;
    academicLevel: AcademicLevelService;
  };

  // Get filter params from URL
  const url = new URL(request.url);
  const streamId = url.searchParams.get('streamId');
  const formId = url.searchParams.get('formId');
  const subjectId = url.searchParams.get('subjectId');
  const studentId = url.searchParams.get('studentId');
  const teacherId = url.searchParams.get('teacherId');

  // Fetch grades with filters
  const grades = await services.grade.getAll({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    streamId: streamId ? parseInt(streamId) : undefined,
    formId: formId ? parseInt(formId) : undefined,
    subjectId: subjectId ? parseInt(subjectId) : undefined,
    studentId: studentId ? parseInt(studentId) : undefined,
    teacherId: teacherId ? parseInt(teacherId) : undefined,
  });

  // Fetch all filter options
  const [streams, forms, subjects, students, teachers] = await Promise.all([
    services.academicLevel.getAllStreams(),
    services.academicLevel.getAllForms(),
    services.subject.getAllSubjects({
      limit: 100,
      sortBy: 'subjectName',
      sortOrder: 'asc',
    }),
    services.student.getAll({
      limit: 100,
      offset: 0,
      sortBy: 'firstName',
      sortOrder: 'asc',
    }),
    services.teacher.getAllTeachers({
      limit: 100,
      sortBy: 'firstName',
      sortOrder: 'asc',
    }),
  ]);

  return {
    grades: grades.filter((g): g is GradeWithRelations => g !== null),
    streams,
    forms,
    subjects,
    students,
    teachers,
  };
}

// Action: handle create, update, delete
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as { grade: GradeService };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    // CREATE
    if (method === 'POST') {
      const data = {
        studentId: parseInt(String(form.get('studentId') ?? '')),
        subjectId: parseInt(String(form.get('subjectId') ?? '')),
        streamId: parseInt(String(form.get('streamId') ?? '')),
        formId: parseInt(String(form.get('formId') ?? '')),
        teacherId: form.get('teacherId')
          ? parseInt(String(form.get('teacherId')))
          : undefined,
        score: parseInt(String(form.get('score') ?? '')),
        remarks: form.get('remarks') ? String(form.get('remarks')) : undefined,
      };
      const created = await services.grade.create(data);
      if (!created) {
        return { error: 'Failed to create grade' };
      }
      return { success: true, grade: created };
    }

    // UPDATE
    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) return { error: 'Grade ID is required' };
      const data = {
        studentId: form.get('studentId')
          ? parseInt(String(form.get('studentId')))
          : undefined,
        subjectId: form.get('subjectId')
          ? parseInt(String(form.get('subjectId')))
          : undefined,
        streamId: form.get('streamId')
          ? parseInt(String(form.get('streamId')))
          : undefined,
        formId: form.get('formId')
          ? parseInt(String(form.get('formId')))
          : undefined,
        teacherId: form.get('teacherId')
          ? parseInt(String(form.get('teacherId')))
          : undefined,
        score: form.get('score')
          ? parseInt(String(form.get('score')))
          : undefined,
        remarks: form.get('remarks') ? String(form.get('remarks')) : undefined,
      };
      const updated = await services.grade.update(String(id), data);
      if (!updated) {
        return { error: 'Failed to update grade' };
      }
      return { success: true, grade: updated };
    }

    // DELETE
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) return { error: 'Grade ID is required' };
      const deleted = await services.grade.delete(String(id));
      if (!deleted) {
        return { error: 'Failed to delete grade' };
      }
      return { success: true, id };
    }

    return { error: 'Unknown method' };
  } catch (err: any) {
    console.error('grades action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

export default function Grades() {
  const {
    grades: initialGrades,
    streams,
    forms,
    subjects,
    students,
    teachers,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const listFetcher = useFetcher();

  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<GradeWithRelations | null>(null);
  const [grades, setGrades] = useState<GradeWithRelations[]>(initialGrades);

  // Filter states
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');

  // Track method when submitting
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      lastMethod.current = method || fetcher.formMethod;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  // react on finished action
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const data = fetcher.data;

    if (data.error) {
      toast.error(data.error);
      lastMethod.current = null;
      return;
    }

    if (data.success) {
      switch (lastMethod.current) {
        case 'POST':
          toast.success('Grade added successfully!');
          setGrades((prev) => [...prev, data.grade]); // optimistic add
          break;

        case 'PUT':
          toast.success('Grade updated successfully!');
          setGrades((prev) =>
            prev.map((g) => (g.id === data.grade.id ? data.grade : g))
          );
          break;

        case 'DELETE':
          toast.error('Grade deleted successfully!');
          setGrades((prev) => prev.filter((g) => g.id !== Number(data.id)));
          break;
      }

      // Refresh from server to sync full data (relations)
      listFetcher.load(window.location.pathname);
      lastMethod.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  // if listFetcher has fresh loader data, sync local state (keeps counts, nested info up-to-date)
  useEffect(() => {
    if (listFetcher.state === 'idle' && listFetcher.data?.grades) {
      setGrades(listFetcher.data.grades);
    }
  }, [listFetcher.state, listFetcher.data]);

  const handleEdit = (grade: GradeWithRelations) => {
    setEditData(grade);
    setFormOpen(true);
  };

  const handleExport = () => {
    try {
      // Prepare CSV headers
      const headers = [
        'Student Name',
        'Subject',
        'Score',
        'Grade',
        'Remarks',
        'Teacher',
        'Stream',
        'Form',
      ];

      // Prepare CSV rows
      const rows = grades.map((grade) => {
        return [
          grade.student
            ? `${grade.student.firstName} ${grade.student.lastName}`
            : '',
          grade.subject ? grade.subject.subjectName : '',
          grade.score.toString(),
          grade.grade || '',
          grade.remarks ? `"${grade.remarks.replace(/"/g, '""')}"` : '', // Escape quotes in remarks
          grade.teacher
            ? `${grade.teacher.firstName} ${grade.teacher.lastName}`
            : '',
          grade.stream?.name || '',
          grade.form?.name || '',
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `grades_export_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Grades exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export grades');
    }
  };

  const handleFilterChange = () => {
    // Build URL with filters
    const params = new URLSearchParams();
    if (selectedStream) params.set('streamId', selectedStream);
    if (selectedForm) params.set('formId', selectedForm);
    if (selectedSubject) params.set('subjectId', selectedSubject);
    if (selectedStudent) params.set('studentId', selectedStudent);
    if (selectedTeacher) params.set('teacherId', selectedTeacher);

    // Reload with filters
    window.location.search = params.toString();
  };

  // Filter forms by stream
  const filteredForms = selectedStream
    ? forms.filter((f) => f.streamId === parseInt(selectedStream))
    : forms;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Grades Management
        </h1>
        <p className="text-muted-foreground mt-2">
          View, add, and manage students' grades by stream, form, or subject.
        </p>
      </div>

      {/* TODO: will deal with this later */}
      {/* Filters and Actions */}
      {/* <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                value={selectedStream}
                onValueChange={(value) => {
                  setSelectedStream(value);
                  setSelectedForm(''); // Reset form when stream changes
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Stream" />
                </SelectTrigger>
                <SelectContent>
                  {streams.map((stream) => (
                    <SelectItem key={stream.id} value={String(stream.id)}>
                      {stream.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedForm}
                onValueChange={setSelectedForm}
                disabled={!selectedStream}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={selectedStream ? 'Form' : 'Select stream first'}
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
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={String(student.id)}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedTeacher}
                onValueChange={setSelectedTeacher}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.id)}>
                      {teacher.firstName} {teacher.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                onClick={handleFilterChange}
                variant="outline"
                size="sm"
                className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card> */}

      {/* Grades Table */}
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Grades</CardTitle>
              <CardDescription>
                A list of all student grades for the selected filters
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                onClick={() => {
                  setEditData(null);
                  setFormOpen(true);
                }}
                className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Grade
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead>Student Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No grades found. Add a grade to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map((grade) => {
                    return (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">
                          {grade.student
                            ? `${grade.student.firstName} ${grade.student.lastName}`
                            : '—'}
                        </TableCell>

                        <TableCell>
                          {grade.subject ? grade.subject.subjectName : '—'}
                        </TableCell>

                        <TableCell>{grade.score}</TableCell>

                        <TableCell>
                          <GradeBadge
                            grade={grade.grade as 'A' | 'B' | 'C' | 'D' | 'F'}
                          />
                        </TableCell>

                        <TableCell className="max-w-xs truncate">
                          {grade.remarks || '—'}
                        </TableCell>

                        <TableCell>
                          {grade.teacher
                            ? `${grade.teacher.firstName} ${grade.teacher.lastName}`
                            : '—'}
                        </TableCell>

                        <TableCell>{grade.stream?.name || '—'}</TableCell>

                        <TableCell>{grade.form?.name || '—'}</TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(grade)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DeleteButton
                              id={grade.id}
                              name={
                                grade.student
                                  ? `${grade.student.firstName} ${grade.student.lastName}`
                                  : 'Grade'
                              }
                              fetcher={fetcher}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <GradeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editData}
        students={students}
        subjects={subjects}
        streams={streams}
        forms={forms}
        teachers={teachers}
        fetcher={fetcher}
      />
    </div>
  );
}
