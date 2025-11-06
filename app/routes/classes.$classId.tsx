// app/routes/classes/$classId.tsx
import { useState } from 'react';
import { useLoaderData, useFetcher, useParams, Link } from 'react-router';
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
import { Plus, Search, Pencil, Trash, ArrowBigLeftDash } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';

import AddStudentModal from '~/components/modal/AddStudentModal';
import EditStudentModal from '~/components/modal/EditStudentModal';
import { StudentProfilesModal } from '~/components/modal/StudentProfileModal';
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router-dom';
import type StudentService from 'workers/services/student';
import { usePagination } from '~/hooks/usePagination';
import { PaginationControls } from '~/components/shared/PaginationControls';
import { DeleteStudentButton } from '~/components/DeleteStudentButton';

// --- Loader ---
export async function loader({ params, context }: LoaderFunctionArgs) {
  const { classId } = params;
  const services = context.services as { student: StudentService; class: any };
  const students = await services.student.getAll({
    limit: 100,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });
  // Filter students belonging to this class
  const filtered = students.filter((s) => s.classId === Number(classId));
  //capture the class details
  const classInfo = await services.class.getById(Number(classId));

  return { students: filtered, class: classInfo };
}

// --- Action ---
export async function action({ request, context, params }: ActionFunctionArgs) {
  const { classId } = params;
  const services = context.services as { student: StudentService };
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  try {
    if (method === 'POST') {
      // Ensure classId is always a valid number or undefined
      const rawClassId = form.get('classId') ?? classId;
      const parsedClassId =
        rawClassId !== undefined && rawClassId !== null && rawClassId !== ''
          ? Number(rawClassId)
          : undefined;

      // CREATE student in this class
      const studentData = {
        firstName: String(form.get('firstName') || ''),
        lastName: String(form.get('lastName') || ''),
        gender: String(form.get('gender') || 'Other'),
        status:
          (String(form.get('status')) as 'Active' | 'Pending' | 'Inactive') ||
          'Active',
        classId: parsedClassId,
        dob: form.get('dob') ? String(form.get('dob')) : undefined,
        email: form.get('email') ? String(form.get('email')) : undefined,
        phone: form.get('phone') ? String(form.get('phone')) : undefined,
        course: form.get('course') ? String(form.get('course')) : undefined,
        grade: form.get('grade') ? String(form.get('grade')) : undefined,
        enrollmentDate: form.get('enrollmentDate')
          ? String(form.get('enrollmentDate'))
          : undefined,
      };
      const created = await services.student.create(studentData);
      return new Response(JSON.stringify({ success: true, student: created }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT') {
      // UPDATE student
      const id = form.get('id') as string;
      const data = Object.fromEntries(form.entries());
      const updated = await services.student.update(id, {
        ...data,
        classId: Number(classId),
      });
      return new Response(JSON.stringify({ success: true, student: updated }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE') {
      const id = form.get('id') as string;
      await services.student.delete(id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'REMOVE') {
      // Remove from class without deleting
      const id = form.get('id') as string;
      // set classId to undefined to clear the association (matches z.number().optional() type)
      await services.student.update(id, { classId: undefined });
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown method' }), {
      status: 400,
    });
  } catch (err: any) {
    console.error('ClassDetails.action error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500 }
    );
  }
}

// --- Component ---
export default function ClassDetails({ params }: { params: any }) {
  const { students: initialStudents, class: classInfo } = useLoaderData() as {
    students: any[];
    class: any;
  };
  const fetcher = useFetcher();
  const { classId } = useParams();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [editStudentModalOpen, setEditStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // filtering logic
  const filteredStudents = initialStudents?.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(search.toLowerCase()) ||
      student.lastName.toLowerCase().includes(search.toLowerCase()) ||
      (student.email &&
        student.email.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter =
      filter === 'all' || student.course === filter || student.grade === filter;
    return matchesSearch && matchesFilter;
  });

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedStudents,
    startIndex,
    goToPage,
  } = usePagination(filteredStudents, 10);

  const handleRemoveFromClass = (id: string) => {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('_method', 'REMOVE');
    fetcher.submit(formData, { method: 'post' });
    console.log('Removed student from class:', id);
  };

  return (
    <div className="space-y-2 h-min-screen overflow-y-auto w-full">
      {/* link to go back to class */}
      {/* back to class but also there is class within department */}
      <Link
        to={classId ? `/classes` : ''}
        className="flex gap-2 bg-primary-gradient text-white py-2 px-4 rounded-[8px] w-fit"
      >
        <ArrowBigLeftDash />
        <span>
          {classId ? 'Back to Classes' : 'Back to Department Classes'}
        </span>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {classInfo?.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage students in this class
          </p>
        </div>
        <Button
          className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
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
              {paginatedStudents?.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {startIndex + index + 1}
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
                  <TableCell>
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
                      onClick={() => {
                        setSelectedStudent(student);
                        setEditStudentModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DeleteStudentButton
                      id={student.id}
                      name={`${student.firstName} ${student.lastName}`}
                      fetcher={fetcher}
                    />
                    {/* <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromClass(student.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash className="h-4 w-4" />
                    </Button> */}
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
      {/* back button to class list
      <Link to="/classes">
        <Button variant="outline" className="mt-4">
          Back to Class List
        </Button>
      </Link> */}

      {/* Modals */}
      {addStudentModalOpen && (
        <AddStudentModal
          open={addStudentModalOpen}
          setOpen={setAddStudentModalOpen}
          classId={classId}
        />
      )}
      {editStudentModalOpen && selectedStudent && (
        <EditStudentModal
          open={editStudentModalOpen}
          setOpen={setEditStudentModalOpen}
          student={selectedStudent}
          classId={classId}
        />
      )}
    </div>
  );
}
