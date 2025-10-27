import { useEffect, useRef, useState } from 'react';
import { useLoaderData, useFetcher } from 'react-router';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Plus, Search, Eye, Pencil } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

import AddStudentModal from '~/components/modal/AddStudentModal';
import EditStudentModal from '~/components/modal/EditStudentModal';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';
import { StudentProfilesModal } from '~/components/modal/StudentProfileModal';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router-dom';
import type StudentService from 'workers/services/student';
import { toast } from 'sonner';
import { usePagination } from '~/hooks/usePagination';
import { PaginationControls } from '~/components/shared/PaginationControls';

// 🧠 Loader – fetch students
export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as { student: StudentService };

  const students = await services.student?.getAll({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });

  return { students };
}

// ⚙️ Action – handle create, update, delete
export async function action({ request, context }: ActionFunctionArgs) {
  const services = context.services as { student: StudentService };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    // --- CREATE STUDENT ---
    if (method === 'POST') {
      // Convert FormDataEntryValue | null to the expected string/union types.
      const data = {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        gender: String(form.get('gender') ?? 'Select gender') as
          | 'Male'
          | 'Female',
        dob: String(form.get('dob') ?? ''),
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        address: form.get('address') ? String(form.get('address')) : undefined,
        guardianName: form.get('guardianName')
          ? String(form.get('guardianName'))
          : undefined,
        guardianPhone: form.get('guardianPhone')
          ? String(form.get('guardianPhone'))
          : undefined,
        photoUrl: form.get('photoUrl')
          ? String(form.get('photoUrl'))
          : undefined,
        course: form.get('course') ? String(form.get('course')) : undefined,
        grade: form.get('grade') ? String(form.get('grade')) : undefined,
        enrollmentDate: form.get('enrollmentDate')
          ? String(form.get('enrollmentDate'))
          : undefined,
        classId: form.get('classId') ? String(form.get('classId')) : undefined,
        status: String(form.get('status') ?? 'Active') as
          | 'Active'
          | 'Pending'
          | 'Inactive',
      };

      const created = await services.student.create(data);
      return new Response(JSON.stringify({ success: true, student: created }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- UPDATE STUDENT ---
    if (method === 'PUT') {
      const id = form.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Student ID is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const data = {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        gender: String(form.get('gender') ?? 'Select gender') as
          | 'Male'
          | 'Female',
        dob: String(form.get('dob') ?? ''),
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        address: form.get('address') ? String(form.get('address')) : undefined,
        guardianName: form.get('guardianName')
          ? String(form.get('guardianName'))
          : undefined,
        guardianPhone: form.get('guardianPhone')
          ? String(form.get('guardianPhone'))
          : undefined,
        photoUrl: form.get('photoUrl')
          ? String(form.get('photoUrl'))
          : undefined,
        course: form.get('course') ? String(form.get('course')) : undefined,
        grade: form.get('grade') ? String(form.get('grade')) : undefined,
        enrollmentDate: form.get('enrollmentDate')
          ? String(form.get('enrollmentDate'))
          : undefined,

        classId: form.get('classId') ? String(form.get('classId')) : undefined,
        status: String(form.get('status') ?? 'Active') as
          | 'Active'
          | 'Pending'
          | 'Inactive',
      };

      const updated = await services.student.update(String(id), data);
      return { success: true, student: updated };
    }

    // --- DELETE STUDENT ---
    if (method === 'DELETE') {
      const id = form.get('id');
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Student ID is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      await services.student.delete(String(id));
      return { success: true };
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('students.action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
export default function Students() {
  const { students: initialStudents } = useLoaderData() as { students: any[] };
  const fetcher = useFetcher();
  const listFetcher = useFetcher();
  const lastMethod = useRef<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [editStudentModalOpen, setEditStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const filteredStudents = initialStudents?.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' || student.course === filter || student.grade === filter;
    return matchesSearch && matchesFilter;
  });

  //pagination logic
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedStudentsList,
    startIndex,
    goToPage,
  } = usePagination(filteredStudents, 10);

  useEffect(() => {
    // 🧠 Keep track of last submitted method
    if (fetcher.state === 'submitting' && fetcher.formData) {
      const method = fetcher.formData.get('_method') as string | null;
      lastMethod.current = method ?? fetcher.formMethod;
    }
  }, [fetcher.state, fetcher.formData, fetcher.formMethod]);

  useEffect(() => {
    // 🧩 Only run after successful completion
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data;

      if (data.error) {
        toast.error(data.error || 'An unexpected error occurred.');
        return;
      }

      if (data.success) {
        // 🔄 Only reload *after* success — and only once per action
        switch (lastMethod.current) {
          case 'POST':
            toast.success('Student added successfully!');
            listFetcher.load(window.location.pathname);
            break;
          case 'PUT':
            toast.success('Student updated successfully!');
            listFetcher.load(window.location.pathname);
            break;
          case 'DELETE':
            toast.error('Student deleted successfully!');
            listFetcher.load(window.location.pathname);
            break;
          default:
            toast.success('Action completed successfully.');
        }

        // 🧹 Reset last method to prevent double reload
        lastMethod.current = null;
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="space-y-2 h-min-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all student records
          </p>
        </div>
        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer"
          onClick={() => setAddStudentModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-10 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by course/grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="A">Grade A</SelectItem>
                <SelectItem value="B+">Grade B+</SelectItem>
                <SelectItem value="B">Grade B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Table */}
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SN</TableHead>
                <TableHead>First name</TableHead>
                <TableHead>Last name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedStudentsList?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {startIndex + student.id}
                  </TableCell>
                  <TableCell>{student.firstName}</TableCell>
                  <TableCell>{student.lastName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.email}
                  </TableCell>
                  <TableCell>{student.course}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-none">
                      {student.grade}
                    </Badge>
                  </TableCell>
                  <TableCell>{student.enrollmentDate}</TableCell>
                  <TableCell className="border-none">
                    <Badge
                      variant={
                        student.status === 'Active'
                          ? 'default'
                          : student.status === 'Pending'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="border-none"
                    >
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <StudentProfilesModal student={student} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedStudent(student);
                        setEditStudentModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteStudentButton
                      id={student.id}
                      name={student.name}
                      fetcher={fetcher}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </CardContent>
      </Card>

      {/* Add Student Modal */}
      {addStudentModalOpen && (
        <AddStudentModal
          open={addStudentModalOpen}
          setOpen={setAddStudentModalOpen}
          fetcher={fetcher}
        />
      )}

      {/* Edit Student Modal */}
      {editStudentModalOpen && selectedStudent && (
        <EditStudentModal
          open={editStudentModalOpen}
          setOpen={setEditStudentModalOpen}
          student={selectedStudent}
          fetcher={fetcher}
        />
      )}
    </div>
  );
}
